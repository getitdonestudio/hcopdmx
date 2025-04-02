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
      maxConsecutiveFailures: 5 // Maximum consecutive failures before attempting recovery
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
  }
  
  /**
   * Start the cycling mode
   */
  start() {
    if (this.running) return;
    super.start();
    
    // Reset state
    this.failedModes = {};
    this.clearAllTimers();
    this.consecutiveFailures = 0;
    this.recoveryMode = false;
    
    // Start with the first mode
    this.currentModeIndex = 0;
    this.loadInitialState()
      .then(() => {
        this.loadMode(this.availableModes[this.currentModeIndex]);
      })
      .catch(error => {
        console.error('Error loading initial state:', error);
        // Try to recover by moving to the next mode
        this.transitionToNextMode();
      });
    
    console.log('Cycling mode started');
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
    if (!this.isTransitioning || !this.running) return;
    
    // Update progress
    this.transitionProgress += this.options.updateInterval / this.options.transitionTime;
    
    if (this.transitionProgress >= 1) {
      // Transition complete
      this.transitionProgress = 1;
      this.applyTargetChannels();
      
      // Clear transition timer
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
      this.isTransitioning = false;
      
      // Schedule the next transition
      this.scheduleNextTransition();
      return;
    }
    
    // Calculate intermediate channels
    const intermediateChannels = this.currentChannels.map((currentVal, i) => {
      const targetVal = this.targetChannels[i] || 0;
      return Math.round(currentVal + (targetVal - currentVal) * this.transitionProgress);
    });
    
    // Apply the intermediate channels
    this.applyChannels(intermediateChannels);
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
  transitionToNextMode() {
    if (!this.running) return;
    
    // Move to the next mode
    this.currentModeIndex = (this.currentModeIndex + 1) % this.availableModes.length;
    
    // If we've tried all modes and they all failed, reset the failed modes list
    if (Object.keys(this.failedModes).length >= this.availableModes.length) {
      console.log('All modes have failed, resetting failed modes list');
      this.failedModes = {};
    }
    
    // If in recovery mode, try to reload the initial state
    if (this.recoveryMode && this.consecutiveFailures > this.options.maxConsecutiveFailures * 2) {
      console.log('Attempting recovery by reloading initial state');
      this.loadInitialState()
        .then(() => {
          // After reloading state, load the next mode
          this.loadMode(this.availableModes[this.currentModeIndex]);
        })
        .catch(() => {
          // If reloading state fails, still try to load the next mode
          this.loadMode(this.availableModes[this.currentModeIndex]);
        });
    } else {
      // Load the next mode
      this.loadMode(this.availableModes[this.currentModeIndex]);
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
      body: JSON.stringify({ channels })
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
        console.log('Exiting recovery mode after successful channel application');
        this.recoveryMode = false;
      }
    })
    .catch(error => {
      console.error('Error applying channels:', error);
      
      // Increment consecutive failure count
      this.consecutiveFailures++;
      
      // Check if we need to enter recovery mode
      if (this.consecutiveFailures > this.options.maxConsecutiveFailures) {
        console.warn('Multiple consecutive failures applying channels, entering recovery mode');
        this.recoveryMode = true;
      }
    });
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = CyclingMode;
} else {
  window.CyclingMode = CyclingMode;
} 