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
      updateInterval: 25 // Update interval (25ms = 40 times per second)
    }, options);
    
    this.currentPhase = 'pause'; // 'rise', 'fall', or 'pause'
    this.currentValue = this.options.minPower;
    this.phaseTime = 0;
    this.baseChannels = null; // Store base channel values
  }
  
  /**
   * Start the pulsating mode
   */
  start() {
    if (this.running) return;
    super.start();
    
    // Initialize with minimum power
    this.currentValue = this.options.minPower;
    this.currentPhase = 'pause';
    this.phaseTime = 0;
    
    // Get the initial state
    this.fetchBaseState();
    
    // Start the animation loop
    this.intervalId = setInterval(() => this.update(), this.options.updateInterval);
    
    console.log('Pulsating mode started');
  }
  
  /**
   * Fetch the base DMX state to use for pulsating
   */
  fetchBaseState() {
    fetch('/dmx/program/q')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.baseChannels = data.channels;
          console.log('Base channels loaded for pulsating mode');
        } else {
          // Fallback: get current state
          return fetch('/state');
        }
      })
      .then(response => {
        if (!response) return null;
        return response.json();
      })
      .then(data => {
        if (data && data.success && !this.baseChannels) {
          this.baseChannels = data.channels;
          console.log('Current state loaded as base for pulsating mode');
        }
      })
      .catch(error => {
        console.error('Error fetching base state for pulsating mode:', error);
        // Create a fallback state with all channels on
        this.baseChannels = Array(512).fill(255);
      });
  }
  
  /**
   * Stop the pulsating mode
   */
  stop() {
    if (!this.running) return;
    super.stop();
    
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
    
    // Calculate the power factor (0.7 to 1.0)
    const powerFactor = this.currentValue / 100;
    
    // If we have base channels, use them
    if (this.baseChannels) {
      // Map all non-zero channels with the power factor
      const channels = this.baseChannels.map(value => {
        if (value === 0) return 0; // Don't touch channels that are off
        return Math.round(value * powerFactor);
      });
      
      // Send the modified channels to DMX
      fetch(`/dmx/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channels })
      })
      .catch(error => {
        console.error('Error in pulsating mode:', error);
      });
    } else {
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