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
      lightPower: 255 // Default light power
    }, options);
    
    // All available DMX modes (a through p)
    this.availableModes = 'abcdefghijklmnop'.split('');
    this.currentMode = null;
    this.usedModes = new Set(); // Track modes we've used to avoid immediate repeats
    this.changeCount = 0;
  }
  
  /**
   * Start the disco mode
   */
  async start() {
    if (this.running) return;
    
    console.log('DiscoMode: Starting...');
    
    // Get current settings
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
        console.log(`DiscoMode: Using light power: ${this.options.lightPower}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    
    super.start();
    
    // Reset tracking variables
    this.usedModes.clear();
    this.changeCount = 0;
    
    // Start with a random mode
    this.changeToRandomMode();
    
    // Set up interval for changing modes
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(() => this.changeToRandomMode(), this.options.changeInterval);
    
    console.log(`DiscoMode: Started with interval ${this.options.changeInterval}ms`);
  }
  
  /**
   * Stop the disco mode
   */
  stop() {
    if (!this.running) return;
    
    console.log('DiscoMode: Stopping...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    super.stop();
    
    console.log('DiscoMode: Stopped');
  }
  
  /**
   * Change to a random DMX program
   */
  changeToRandomMode() {
    if (!this.running) return;
    
    this.changeCount++;
    
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
    this.applyDmxMode(randomMode);
    
    // Log periodically, not for every change to avoid console spam
    if (this.changeCount % 5 === 0) {
      console.log(`DiscoMode: Switched to ${randomMode.toUpperCase()} (change #${this.changeCount})`);
    }
  }
  
  /**
   * Apply a specific DMX program directly
   */
  async applyDmxMode(modeKey) {
    try {
      const response = await fetch(`/dmx/program/${modeKey}`);
      if (!response.ok) {
        throw new Error(`Failed to load program ${modeKey}: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(`Failed to load program: ${modeKey}`);
      }
      
      // The channels from the program endpoint are binary (0 or 1)
      // We need to scale them to the desired power level
      const scaledChannels = data.channels.map(value => 
        value === 1 ? this.options.lightPower : 0
      );
      
      // Send directly using the DMX direct endpoint
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
    } catch (error) {
      console.error(`DiscoMode: Error applying program ${modeKey}:`, error);
    }
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = DiscoMode;
} else {
  window.DiscoMode = DiscoMode;
} 