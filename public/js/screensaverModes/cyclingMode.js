/**
 * Cycling Screensaver Mode
 * Cycles through DMX program modes in sequence with transitions
 */
class CyclingMode extends ScreensaverMode {
  constructor(options = {}) {
    super(options);
    
    // Default options
    this.options = Object.assign({
      programKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'],
      transitionTime: 2000, // Time in ms to transition between modes
      holdTime: 5000, // Time in ms to hold each mode
      maxConsecutiveFailures: 3 // Max failures before entering recovery mode
    }, options);
    
    this.currentIndex = 0;
    this.currentMode = null;
    this.channels = null;
    this.loading = false;
    this.scheduledChange = null;
    this.failedModes = new Set();
    this.consecutiveFailures = 0;
    this.recoveryMode = false;
    this.lastRequestTime = 0;
    this.requestThrottle = 100; // ms between requests
  }
  
  /**
   * Start the cycling mode
   */
  async start() {
    if (this.running) return;
    
    console.log('Starting cycling screensaver mode');
    
    // Also log to terminal for monitoring
    fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: 'info',
        message: 'Starting CYCLING screensaver mode'
      })
    }).catch(err => console.error('Failed to log to server:', err));
    
    super.start();
    
    // Reset state
    this.currentIndex = 0;
    this.currentMode = null;
    this.failedModes.clear();
    this.consecutiveFailures = 0;
    this.recoveryMode = false;
    
    // Start by loading the initial state
    await this.loadInitialState();
    
    // Then start cycling
    this.scheduleNextMode();
  }
  
  /**
   * Load initial DMX state
   */
  async loadInitialState() {
    try {
      const response = await fetch('/state');
      if (!response.ok) {
        throw new Error('Failed to load initial state');
      }
      
      const data = await response.json();
      
      if (data.success && data.channels) {
        this.channels = [...data.channels];
      } else {
        throw new Error('Invalid state data received');
      }
    } catch (error) {
      console.error('Error loading initial state:', error);
      
      // Create a fallback state with all zeros
      this.channels = Array(512).fill(0);
      
      // Enter recovery mode immediately
      this.consecutiveFailures++;
      this.recoveryMode = true;
    }
  }
  
  /**
   * Stop the cycling mode
   */
  stop() {
    if (!this.running) return;
    
    // Clear any scheduled changes
    if (this.scheduledChange) {
      clearTimeout(this.scheduledChange);
      this.scheduledChange = null;
    }
    
    super.stop();
    
    console.log('Cycling mode stopped');
  }
  
  /**
   * Schedule loading the next mode
   */
  scheduleNextMode() {
    if (!this.running) return;
    
    // Clear any existing scheduled change
    if (this.scheduledChange) {
      clearTimeout(this.scheduledChange);
    }
    
    // Determine the next index, skipping modes that have failed multiple times
    let nextIndex = this.currentIndex;
    let attempts = 0;
    const maxAttempts = this.options.programKeys.length;
    
    do {
      nextIndex = (nextIndex + 1) % this.options.programKeys.length;
      attempts++;
      
      // If we've tried all modes and they've all failed, reset the failed modes set
      if (attempts > maxAttempts) {
        this.failedModes.clear();
        break;
      }
    } while (
      this.failedModes.has(this.options.programKeys[nextIndex]) && 
      attempts < maxAttempts
    );
    
    this.currentIndex = nextIndex;
    
    // Schedule the change after the hold time
    const delay = this.recoveryMode ? 
      this.options.holdTime * 2 : // Longer delay in recovery mode
      this.options.holdTime;
      
    this.scheduledChange = setTimeout(() => {
      this.loadMode(this.options.programKeys[this.currentIndex]);
    }, delay);
  }
  
  /**
   * Load a specific DMX program mode
   * @param {string} key - DMX program key
   */
  async loadMode(key) {
    if (!this.running) return;
    
    // Skip loading if already loading
    if (this.loading) {
      this.scheduleNextMode();
      return;
    }
    
    // If in recovery mode, rate limit requests
    if (this.recoveryMode) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      
      if (elapsed < this.requestThrottle * 5) { // 5x normal throttle in recovery
        console.log(`Rate limiting in recovery mode (${elapsed}ms)`);
        this.scheduleNextMode();
        return;
      }
    }
    
    // Check if this mode has failed before
    if (this.failedModes.has(key)) {
      // Skip this mode if it's failed before
      this.scheduleNextMode();
      return;
    }
    
    this.loading = true;
    this.lastRequestTime = Date.now();
    
    try {
      const response = await fetch(`/dmx/program/${key}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load program ${key}: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.channels) {
        throw new Error(`Invalid program data for ${key}`);
      }
      
      // Store the target mode
      this.currentMode = key;
      
      // Apply the new channels gradually
      await this.applyChannels(data.channels);
      
      // Reset failure count after success
      this.consecutiveFailures = 0;
      this.recoveryMode = false;
      
      // Schedule the next change
      this.scheduleNextMode();
    } catch (error) {
      console.error(`Error loading program ${key}:`, error);
      
      // Mark this mode as failed
      this.failedModes.add(key);
      
      // Count the failure
      this.consecutiveFailures++;
      
      // Enter recovery mode if we've had multiple consecutive failures
      if (this.consecutiveFailures >= this.options.maxConsecutiveFailures) {
        console.warn(`Multiple consecutive failures (${this.consecutiveFailures}), entering recovery mode`);
        this.recoveryMode = true;
      }
      
      // Try the next mode
      this.scheduleNextMode();
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Apply channels with a smooth transition
   * @param {number[]} targetChannels - Target channel values
   */
  async applyChannels(targetChannels) {
    if (!this.running) return;
    
    // Ensure we have current channels to transition from
    if (!this.channels) {
      this.channels = Array(targetChannels.length).fill(0);
    }
    
    // Ensure both arrays are the same length
    while (this.channels.length < targetChannels.length) {
      this.channels.push(0);
    }
    
    // Calculate the transition step based on transition time and interval
    const steps = Math.max(2, Math.ceil(this.options.transitionTime / 50)); // 50ms per step
    const stepDelay = Math.floor(this.options.transitionTime / steps);
    
    for (let i = 0; i <= steps; i++) {
      if (!this.running) return;
      
      // In recovery mode, rate limit DMX sends
      if (this.recoveryMode && i > 0 && i < steps) {
        // Only send every 4th step in recovery mode to reduce load
        if (i % 4 !== 0) {
          continue;
        }
      }
      
      // Calculate transition progress (0.0 to 1.0)
      const progress = i / steps;
      
      // Interpolate between current and target values
      const currentValues = this.channels.map((current, index) => {
        const target = targetChannels[index] || 0;
        return Math.round(current + (target - current) * progress);
      });
      
      try {
        // Send the DMX update
        await fetch('/dmx/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channels: currentValues
          })
        });
        
        // Update the current channels
        this.channels = currentValues;
        
        // Small delay between steps (except final step)
        if (i < steps) {
          await new Promise(resolve => setTimeout(resolve, stepDelay));
        }
      } catch (error) {
        console.error('Error applying channels during transition:', error);
        // If we hit an error during transition, just finish up
        break;
      }
    }
    
    // Ensure final state matches target exactly
    this.channels = [...targetChannels];
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = CyclingMode;
} else {
  window.CyclingMode = CyclingMode;
} 