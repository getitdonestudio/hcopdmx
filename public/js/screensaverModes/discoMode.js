/**
 * Disco Screensaver Mode
 * Changes through all DMX programs (a-p) in a very fast and random pace
 * One program per second with direct changes (no dimming)
 */
class DiscoMode extends ScreensaverMode {
  constructor(options = {}) {
    super(options);
    
    // Default options
    this.options = Object.assign({
      changeInterval: 1000, // Time between program changes (1 second)
      lightPower: 255, // Default light power
      maxConsecutiveFailures: 5, // Maximum consecutive failures before attempting recovery
      minRequestInterval: 100 // Minimum time between requests (ms)
    }, options);
    
    // All available DMX modes (a through p)
    this.availableModes = 'abcdefghijklmnop'.split('');
    this.currentMode = null;
    this.usedModes = new Set(); // Track modes we've used to avoid immediate repeats
    this.changeCount = 0;
    this.consecutiveFailures = 0;
    this.recoveryMode = false;
    this.lastRequestTime = 0;
    this.isChanging = false;
  }
  
  /**
   * Start the disco mode
   */
  async start() {
    if (this.running) return;
    
    console.log('Starting disco screensaver mode');
    
    // Log to server/terminal
    fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: 'info',
        message: 'Starting DISCO screensaver mode'
      })
    }).catch(err => console.error('Failed to log to server:', err));
    
    // Get current settings
    const settingsResponse = await this.safeFetch('/api/settings');
    if (settingsResponse.success) {
      const settings = settingsResponse.data;
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
      }
    }
    
    super.start();
    
    // Reset tracking variables
    this.usedModes.clear();
    this.changeCount = 0;
    this.consecutiveFailures = 0;
    this.recoveryMode = false;
    this.lastRequestTime = 0;
    
    // Start with a random mode
    await this.changeToRandomMode();
    
    // Set up interval for changing modes
    const intervalId = setInterval(() => this.changeToRandomMode(), this.options.changeInterval);
    this.registerInterval(intervalId);
  }
  
  /**
   * Stop the disco mode
   */
  stop() {
    if (!this.running) return;
    
    console.log('Stopping disco screensaver mode');
    super.stop(); // This will clear all registered timers
  }
  
  /**
   * Change to a random DMX program
   */
  async changeToRandomMode() {
    if (!this.running || this.isChanging) return;
    
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < this.options.minRequestInterval) {
      // If changing too rapidly, delay until next interval
      return;
    }
    
    this.isChanging = true;
    this.changeCount++;
    this.lastRequestTime = now;
    
    try {
      let availableChoices = this.availableModes.filter(mode => !this.usedModes.has(mode));
      
      // If we've used too many modes, reset the used modes set
      // but always keep the current mode in the used set to avoid immediate repeat
      if (availableChoices.length < 3) {
        this.usedModes.clear();
        if (this.currentMode) {
          this.usedModes.add(this.currentMode);
        }
        availableChoices = this.availableModes.filter(mode => !this.usedModes.has(mode));
      }
      
      // Choose a random mode from available choices
      const randomIndex = Math.floor(Math.random() * availableChoices.length);
      const randomMode = availableChoices[randomIndex];
      
      // Keep track of this mode
      this.currentMode = randomMode;
      this.usedModes.add(randomMode);
      
      // Apply the mode
      await this.applyDmxMode(randomMode);
      
      // Reset failures on success
      this.consecutiveFailures = 0;
      
      // Exit recovery mode if successful
      if (this.recoveryMode && this.consecutiveFailures === 0) {
        this.recoveryMode = false;
      }
      
      // Don't log individual mode changes to reduce console spam
    } catch (error) {
      this.consecutiveFailures++;
      console.error(`Error in disco mode (failure #${this.consecutiveFailures}):`, error);
      
      // Enter recovery mode if too many failures
      if (this.consecutiveFailures >= this.options.maxConsecutiveFailures && !this.recoveryMode) {
        this.recoveryMode = true;
        console.warn(`Entering recovery mode after ${this.consecutiveFailures} consecutive failures`);
      }
    } finally {
      this.isChanging = false;
    }
  }
  
  /**
   * Apply a specific DMX program directly
   */
  async applyDmxMode(modeKey) {
    // Rate limiting for requests in recovery mode
    if (this.recoveryMode) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < 2000) { // More aggressive rate limiting in recovery mode
        throw new Error(`Rate limited in recovery mode: ${timeSinceLastRequest}ms since last request`);
      }
      this.lastRequestTime = now;
    }
    
    // Fetch the program channels
    const programResponse = await this.safeFetch(`/dmx/program/${modeKey}`);
    if (!programResponse.success) {
      throw new Error(`Failed to load program: ${modeKey}`);
    }
    
    const data = programResponse.data;
    
    // Scale the binary channels to the configured light power
    const scaledChannels = data.channels.map(value => 
      value === 1 ? this.options.lightPower : 0
    );
    
    // Send the channels to the DMX controller
    const directResponse = await fetch('/dmx/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channels: scaledChannels,
        useScreensaverPower: true
      })
    });
    
    if (!directResponse.ok) {
      throw new Error(`Failed to send direct DMX command: ${directResponse.status}`);
    }
    
    const directResult = await directResponse.json();
    if (!directResult.success) {
      throw new Error('Failed to apply DMX values');
    }
    
    // Return true on success
    return true;
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = DiscoMode;
} else {
  window.DiscoMode = DiscoMode;
} 