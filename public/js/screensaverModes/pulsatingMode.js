/**
 * Pulsating Screensaver Mode
 * Creates a heartbeat-like pulsing effect between 70% and 100% power
 */
class PulsatingMode extends ScreensaverMode {
  constructor(options = {}) {
    super(options);
    
    // Default options
    this.options = Object.assign({
      minPower: 70, // Minimum power percentage (70%)
      maxPower: 100, // Maximum power percentage (100%)
      beatDuration: 3000, // Duration of one complete heartbeat (3 seconds)
      riseDuration: 1500, // Time to rise from min to max (1.5 seconds)
      fallDuration: 800, // Time to fall from max to min (0.8 seconds)
      pauseDuration: 700, // Pause at minimum power (0.7 seconds)
      updateInterval: 50, // Update interval (50ms = 20 times per second, reduced from 25ms)
      stateRefreshInterval: 30000, // Refresh state every 30 seconds
      lightPower: 255 // Default light power
    }, options);
    
    this.currentPhase = 'pause'; // 'rise', 'fall', or 'pause'
    this.currentValue = this.options.minPower;
    this.phaseTime = 0;
    this.baseChannels = null; // Store base channel values
    this.lastDmxSendTime = 0;
    this.failedRequests = 0;
    this.stateRefreshTimerId = null;
    this.recoveryMode = false;
  }
  
  /**
   * Start the pulsating mode
   */
  async start() {
    if (this.running) return;
    
    console.log('Starting pulsating screensaver mode');
    
    // Also log to terminal for monitoring
    fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: 'info',
        message: 'Starting PULSATING screensaver mode'
      })
    }).catch(err => console.error('Failed to log to server:', err));
    
    // Get current settings
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    
    super.start();
    
    // Start the heartbeat
    this.startHeartbeat();
  }
  
  /**
   * Calculate the current power value based on the phase
   */
  calculateCurrentValue() {
    const now = Date.now();
    const elapsed = now - this.phaseTime;
    
    let power;
    switch (this.currentPhase) {
      case 'rise':
        if (elapsed >= this.options.riseDuration) {
          this.currentPhase = 'fall';
          this.phaseTime = now;
          power = this.options.maxPower;
        } else {
          power = this.options.minPower + 
            ((this.options.maxPower - this.options.minPower) * 
             (elapsed / this.options.riseDuration));
        }
        break;
        
      case 'fall':
        if (elapsed >= this.options.fallDuration) {
          this.currentPhase = 'pause';
          this.phaseTime = now;
          power = this.options.minPower;
        } else {
          power = this.options.maxPower - 
            ((this.options.maxPower - this.options.minPower) * 
             (elapsed / this.options.fallDuration));
        }
        break;
        
      case 'pause':
        if (elapsed >= this.options.pauseDuration) {
          this.currentPhase = 'rise';
          this.phaseTime = now;
          power = this.options.minPower;
        } else {
          power = this.options.minPower;
        }
        break;
        
      default:
        power = this.options.minPower;
    }

    // Scale the power based on the configured light power
    return Math.round((power / 100) * this.options.lightPower);
  }
  
  /**
   * Start the heartbeat effect
   */
  startHeartbeat() {
    if (!this.running) return;
    
    const updatePower = async () => {
      if (!this.running) return;
      
      const power = this.calculateCurrentValue();
      
      try {
        // Use direct command to ensure exact power values
        await fetch('/dmx/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channels: Array(512).fill(power)
          })
        });
        
        this.failedRequests = 0;
      } catch (error) {
        console.error('Error updating power:', error);
        this.failedRequests++;
        
        if (this.failedRequests >= 3) {
          console.error('Too many failed requests, stopping pulsating mode');
          this.stop();
        }
      }
      
      // Schedule next update
      setTimeout(updatePower, this.options.updateInterval);
    };
    
    // Start the updates
    updatePower();
  }
  
  /**
   * Fetch the base DMX state to use for pulsating
   */
  fetchBaseState() {
    fetch('/dmx/program/q')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch base state: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          this.baseChannels = data.channels;
          this.recoveryMode = false;
        } else {
          // Fallback: get current state
          return fetch('/state');
        }
      })
      .then(response => {
        if (!response) return null;
        if (!response.ok) {
          throw new Error(`Failed to fetch current state: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.success && !this.baseChannels) {
          this.baseChannels = data.channels;
          this.recoveryMode = false;
        }
      })
      .catch(error => {
        console.error('Error fetching base state for pulsating mode:', error);
        
        if (!this.baseChannels) {
          // Create a fallback state with all channels on
          this.baseChannels = Array(512).fill(255);
        }
        
        // Enter recovery mode if we have multiple failures
        this.failedRequests++;
        if (this.failedRequests > 3) {
          this.recoveryMode = true;
        }
      });
  }
  
  /**
   * Stop the pulsating mode
   */
  stop() {
    if (!this.running) return;
    
    // Clear the state refresh timer
    if (this.stateRefreshTimerId) {
      clearInterval(this.stateRefreshTimerId);
      this.stateRefreshTimerId = null;
    }
    
    super.stop();
    
    // Clear any other resources
    this.baseChannels = null;
    this.failedRequests = 0;
    
    console.log('Pulsating mode stopped');
  }
  
  /**
   * Apply easing to create a more natural pulse
   * @param {number} t - Current progress (0-1)
   * @param {string} phase - Current phase ('rise' or 'fall')
   * @returns {number} Eased value
   */
  easeHeartbeat(t, phase) {
    if (phase === 'rise') {
      // Cubic ease-in for rise (accelerate)
      return t * t * t;
    } else {
      // Quadratic ease-out for fall (decelerate)
      return t * (2 - t);
    }
  }
  
  /**
   * Update the pulsating effect
   */
  update() {
    if (!this.running) return;
    
    // Skip updates if we're in recovery mode and it's not time to try again
    if (this.recoveryMode) {
      // In recovery mode, only update every 5 seconds to reduce load
      const now = Date.now();
      if (now - this.lastDmxSendTime < 5000) {
        return;
      }
      
      // When in recovery mode, try to fetch the base state again
      this.fetchBaseState();
    }
    
    const timeStep = this.options.updateInterval;
    const { minPower, maxPower, riseDuration, fallDuration, pauseDuration } = this.options;
    
    // Update the phase timer
    this.phaseTime += timeStep;
    
    // Handle each phase
    if (this.currentPhase === 'pause') {
      // During pause, stay at minimum power
      this.currentValue = minPower;
      
      // Check if pause is over
      if (this.phaseTime >= pauseDuration) {
        // Start rising
        this.currentPhase = 'rise';
        this.phaseTime = 0;
      }
    } 
    else if (this.currentPhase === 'rise') {
      // Calculate progress through rise (0-1)
      const progress = Math.min(this.phaseTime / riseDuration, 1);
      
      // Apply easing to make it more natural
      const easedProgress = this.easeHeartbeat(progress, 'rise');
      
      // Calculate the current value
      this.currentValue = minPower + (maxPower - minPower) * easedProgress;
      
      // Check if rise is complete
      if (progress >= 1) {
        // Start falling
        this.currentPhase = 'fall';
        this.phaseTime = 0;
      }
    } 
    else if (this.currentPhase === 'fall') {
      // Calculate progress through fall (0-1)
      const progress = Math.min(this.phaseTime / fallDuration, 1);
      
      // Apply easing for a more natural fall
      const easedProgress = this.easeHeartbeat(progress, 'fall');
      
      // Calculate the current value
      this.currentValue = maxPower - (maxPower - minPower) * easedProgress;
      
      // Check if fall is complete
      if (progress >= 1) {
        // Start pause
        this.currentPhase = 'pause';
        this.phaseTime = 0;
      }
    }
    
    // Apply the current value to the lights using DMX
    this.applyPulseToDmx();
  }
  
  /**
   * Apply the current pulse value to DMX
   */
  applyPulseToDmx() {
    if (!this.running) return;
    
    // Rate limiting - don't send DMX commands too frequently
    const now = Date.now();
    if (now - this.lastDmxSendTime < 80) { // At most 12.5 updates per second
      return;
    }
    this.lastDmxSendTime = now;
    
    // Calculate the power factor (0.7 to 1.0)
    const powerFactor = this.currentValue / 100;
    
    // If we have base channels, use them
    if (this.baseChannels) {
      // Map all non-zero channels with the power factor
      const channels = this.baseChannels.map(value => {
        if (value === 0) return 0; // Don't touch channels that are off
        return Math.round(value * powerFactor);
      });
      
      // Send the modified channels to DMX with proper error handling
      fetch(`/dmx/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channels })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`DMX direct send failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        // Reset failed requests counter on success
        this.failedRequests = 0;
        
        // Exit recovery mode if we were in it
        if (this.recoveryMode) {
          console.log('Exiting recovery mode after successful DMX send');
          this.recoveryMode = false;
        }
      })
      .catch(error => {
        console.error('Error in pulsating mode DMX send:', error);
        
        // Count failures and enter recovery mode if too many
        this.failedRequests++;
        if (this.failedRequests > 3) {
          console.warn('Multiple DMX send failures, entering recovery mode');
          this.recoveryMode = true;
        }
      });
    } else if (!this.recoveryMode) {
      // If we don't have base channels yet, try to fetch them again
      this.fetchBaseState();
    }
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = PulsatingMode;
} else {
  window.PulsatingMode = PulsatingMode;
} 