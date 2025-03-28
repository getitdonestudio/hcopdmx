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
    }, options);
    
    // All available DMX modes (a through p)
    this.availableModes = 'abcdefghijklmnop'.split('');
    this.currentMode = null;
    this.usedModes = new Set(); // Track modes we've used to avoid immediate repeats
  }
  
  /**
   * Start the disco mode
   */
  start() {
    if (this.running) return;
    super.start();
    
    // Reset the used modes
    this.usedModes.clear();
    
    // Start with a random mode
    this.changeToRandomMode();
    
    // Set up interval for changing modes
    this.intervalId = setInterval(() => this.changeToRandomMode(), this.options.changeInterval);
    
    console.log('Disco mode started');
  }
  
  /**
   * Stop the disco mode
   */
  stop() {
    if (!this.running) return;
    super.stop();
    
    console.log('Disco mode stopped');
  }
  
  /**
   * Change to a random DMX program
   */
  changeToRandomMode() {
    if (!this.running) return;
    
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
    
    console.log(`Disco mode switched to: ${randomMode.toUpperCase()}`);
  }
  
  /**
   * Apply a specific DMX program directly
   */
  applyDmxMode(modeKey) {
    fetch(`/dmx/${modeKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .catch(error => {
      console.error(`Error applying program ${modeKey}:`, error);
    });
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = DiscoMode;
} else {
  window.DiscoMode = DiscoMode;
} 