/**
 * Cycling Screensaver Mode
 * Cycles through all modes (a-p) with smooth fading transitions
 */
class CyclingMode extends ScreensaverMode {
  constructor(options = {}) {
    super(options);
    
    // Default options
    this.options = Object.assign({
      dwellTime: 10000, // Time to stay on each mode (10 seconds)
      transitionTime: 2000, // Time to transition between modes (2 seconds)
      updateInterval: 100, // Update interval for transitions (100ms)
      retryInterval: 1000, // Retry interval if a mode fails to load (1 second)
      maxConsecutiveFailures: 5, // Maximum consecutive failures before attempting recovery
      lightPower: 255 // Default light power
    }, options);
    
    // All available DMX modes (a through p)
    this.availableModes = 'abcdefghijklmnop'.split('');
    this.currentModeIndex = 0;
    this.isTransitioning = false;
    this.currentChannels = null;
    this.targetChannels = null;
    this.transitionProgress = 0;
    this.failedModes = {};
    this.activeTimers = [];
    this.consecutiveFailures = 0;
    this.recoveryMode = false;
    this.lastNetworkRequestTime = 0;
    this.transitionStartTime = 0;
  }
  
  /**
   * Start the cycling mode
   */
  async start() {
    if (this.running) return;
    
    console.log('CyclingMode: Starting...');
    
    // Get current settings
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
        console.log(`CyclingMode: Using light power: ${this.options.lightPower}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    
    super.start();
    
    // Start cycling through modes
    console.log('CyclingMode: Starting to cycle through modes');
    this.transitionToNextMode();
  }
  
  /**
   * Load initial state to ensure we have a valid starting point
   */
  loadInitialState() {
    return fetch('/state')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load initial state: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          this.currentChannels = [...data.channels];
          console.log('Initial state loaded for cycling mode');
          this.consecutiveFailures = 0;
          this.recoveryMode = false;
        } else {
          // Create a fallback state
          this.currentChannels = Array(512).fill(0);
          console.warn('Using fallback state for cycling mode');
        }
      })
      .catch(error => {
        console.error('Error loading initial state:', error);
        // Create a fallback state
        this.currentChannels = Array(512).fill(0);
        this.consecutiveFailures++;
        
        if (this.consecutiveFailures > this.options.maxConsecutiveFailures) {
          console.warn('Multiple failures detected, entering recovery mode');
          this.recoveryMode = true;
        }
        
        throw error; // Rethrow for the caller to handle
      });
  }
  
  /**
   * Stop the cycling mode
   */
  stop() {
    if (!this.running) return;
    super.stop();
    
    this.clearAllTimers();
    this.recoveryMode = false;
    this.consecutiveFailures = 0;
    console.log('Cycling mode stopped');
  }
  
  /**
   * Clear all active timers
   */
  clearAllTimers() {
    // Clear mode change timer
    if (this.modeChangeTimer) {
      clearTimeout(this.modeChangeTimer);
      this.modeChangeTimer = null;
    }
    
    // Clear transition timer
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }
    
    // Clear any other active timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers = [];
  }
  
  /**
   * Load a specific DMX mode
   */
  loadMode(modeKey) {
    if (!this.running) return;
    
    // If in recovery mode, limit request frequency
    if (this.recoveryMode) {
      const now = Date.now();
      if (now - this.lastNetworkRequestTime < 5000) {
        // In recovery mode, schedule the next transition after a delay
        console.log('In recovery mode, delaying next transition');
        this.scheduleNextTransition();
        return;
      }
    }
    
    // If this mode previously failed and we haven't tried all modes,
    // skip to the next one
    if (this.failedModes[modeKey] && Object.keys(this.failedModes).length < this.availableModes.length) {
      console.log(`Skipping previously failed mode: ${modeKey}`);
      this.transitionToNextMode();
      return;
    }
    
    console.log(`Loading mode: ${modeKey}`);
    this.lastNetworkRequestTime = Date.now();
    
    // Get the mode's channels
    fetch(`/dmx/program/${modeKey}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load mode ${modeKey}: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success || !this.running) {
          throw new Error(`Failed to load mode: ${modeKey}`);
        }
        
        // Store the target channels
        this.targetChannels = data.channels;
        
        if (!this.currentChannels) {
          // If we don't have current channels, initialize with zeros
          this.currentChannels = Array(this.targetChannels.length).fill(0);
        }
        
        if (this.options.transitionTime > 0) {
          // Start the transition
          this.startTransition();
        } else {
          // Apply immediately
          this.applyTargetChannels();
          this.scheduleNextTransition();
        }
        
        // Clear this mode from failed modes if it was there
        delete this.failedModes[modeKey];
        
        // Reset consecutive failures on success
        this.consecutiveFailures = 0;
        
        // Exit recovery mode if we were in it
        if (this.recoveryMode) {
          console.log('Exiting recovery mode after successful mode load');
          this.recoveryMode = false;
        }
      })
      .catch(error => {
        console.error(`Error loading mode ${modeKey}:`, error);
        
        // Mark this mode as failed
        this.failedModes[modeKey] = true;
        
        // Increment consecutive failure count
        this.consecutiveFailures++;
        
        // Check if we need to enter recovery mode
        if (this.consecutiveFailures > this.options.maxConsecutiveFailures) {
          console.warn('Multiple consecutive failures, entering recovery mode');
          this.recoveryMode = true;
        }
        
        // Try the next mode after a short delay
        const retryTimer = setTimeout(() => {
          if (this.running) {
            this.transitionToNextMode();
          }
        }, this.recoveryMode ? 5000 : this.options.retryInterval); // Longer delay in recovery mode
        
        this.activeTimers.push(retryTimer);
      });
  }
  
  /**
   * Start a transition to the next mode
   */
  startTransition() {
    if (!this.currentChannels || !this.targetChannels || !this.running) return;
    
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionStartTime = Date.now();
    
    // Clear any existing transition timer
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
    }
    
    // Set up the transition timer
    this.transitionTimer = setInterval(() => {
      this.updateTransition();
    }, this.options.updateInterval);
  }
  
  /**
   * Update the transition progress
   */
  updateTransition() {
    if (!this.currentChannels || !this.targetChannels || !this.running) return;
    
    // Calculate progress (0-1)
    this.transitionProgress = Math.min(
      (Date.now() - this.transitionStartTime) / this.options.transitionTime,
      1
    );
    
    // Calculate current channels with easing
    const easedProgress = this.easeTransition(this.transitionProgress);
    const currentChannels = this.currentChannels.map((current, index) => {
      const target = this.targetChannels[index];
      if (current === 0 && target === 0) return 0; // Don't transition zero values
      return Math.round(current + (target - current) * easedProgress);
    });
    
    // Scale the channels by light power
    const scaledChannels = currentChannels.map(value => {
      if (value === 0) return 0; // Don't scale zero values
      return Math.round((value / 255) * this.options.lightPower);
    });
    
    // Apply the scaled channels
    this.applyChannels(scaledChannels);
    
    // Check if transition is complete
    if (this.transitionProgress >= 1) {
      this.isTransitioning = false;
      if (this.transitionTimer) {
        clearInterval(this.transitionTimer);
        this.transitionTimer = null;
      }
      this.scheduleNextTransition();
    }
  }
  
  /**
   * Schedule the next mode transition
   */
  scheduleNextTransition() {
    if (!this.running) return;
    
    // Clear any existing timer
    if (this.modeChangeTimer) {
      clearTimeout(this.modeChangeTimer);
    }
    
    // Use a shorter dwell time in recovery mode
    const dwellTime = this.recoveryMode ? 
      Math.max(5000, this.options.dwellTime / 2) : 
      this.options.dwellTime;
    
    // Schedule the next mode change
    this.modeChangeTimer = setTimeout(() => {
      if (this.running) {
        this.transitionToNextMode();
      }
    }, dwellTime);
  }
  
  /**
   * Transition to the next mode
   */
  async transitionToNextMode() {
    if (!this.running) return;
    
    // Get the next mode
    const nextMode = this.availableModes[this.currentModeIndex];
    console.log(`CyclingMode: Transitioning to mode ${nextMode} with power ${this.options.lightPower}`);
    
    try {
      // Send the DMX fade command with the correct light power
      const response = await fetch(`/dmx/fade/${nextMode}?duration=${this.options.transitionTime}&screensaver=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to transition to mode ${nextMode}: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(`Failed to transition to mode ${nextMode}`);
      }
      
      // Update the current mode index
      this.currentModeIndex = (this.currentModeIndex + 1) % this.availableModes.length;
      
      // Reset failure tracking
      this.consecutiveFailures = 0;
      this.failedModes = {};
      
      // Schedule the next transition
      this.scheduleNextTransition();
    } catch (error) {
      console.error(`CyclingMode: Error transitioning to mode ${nextMode}:`, error);
      this.handleModeFailure(nextMode);
    }
  }
  
  /**
   * Apply the target channels directly
   */
  applyTargetChannels() {
    if (!this.targetChannels) return;
    
    this.currentChannels = [...this.targetChannels];
    this.applyChannels(this.currentChannels);
  }
  
  /**
   * Apply channels to DMX
   */
  applyChannels(channels) {
    // Rate limit in recovery mode
    if (this.recoveryMode) {
      const now = Date.now();
      if (now - this.lastNetworkRequestTime < 1000) { // Max once per second in recovery mode
        return;
      }
      this.lastNetworkRequestTime = now;
    }
    
    fetch('/dmx/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        channels, 
        useScreensaverPower: true 
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to apply channels: ${response.status}`);
      }
      return response.json();
    })
    .then(() => {
      // Reset consecutive failures on success
      this.consecutiveFailures = 0;
      
      // Exit recovery mode if we were in it
      if (this.recoveryMode && this.consecutiveFailures === 0) {
        console.log('CyclingMode: Exiting recovery mode after successful channel application');
        this.recoveryMode = false;
      }
    })
    .catch(error => {
      console.error('CyclingMode: Error applying channels:', error);
      
      // Increment consecutive failure count
      this.consecutiveFailures++;
      
      // Check if we need to enter recovery mode
      if (this.consecutiveFailures > this.options.maxConsecutiveFailures) {
        console.warn('CyclingMode: Multiple consecutive failures applying channels, entering recovery mode');
        this.recoveryMode = true;
      }
    });
  }
  
  /**
   * Handle mode failure
   */
  handleModeFailure(mode) {
    // Record the failure
    this.failedModes[mode] = (this.failedModes[mode] || 0) + 1;
    this.consecutiveFailures++;
    
    // If we've failed too many times, enter recovery mode
    if (this.consecutiveFailures >= this.options.maxConsecutiveFailures) {
      console.log('Entering recovery mode due to consecutive failures');
      this.recoveryMode = true;
      
      // Try to recover by moving to the next mode
      this.currentModeIndex = (this.currentModeIndex + 1) % this.availableModes.length;
    }
    
    // Schedule a retry
    setTimeout(() => {
      if (this.running) {
        this.transitionToNextMode();
      }
    }, this.options.retryInterval);
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = CyclingMode;
} else {
  window.CyclingMode = CyclingMode;
} 