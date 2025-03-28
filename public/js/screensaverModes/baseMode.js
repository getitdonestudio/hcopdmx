/**
 * Base class for screensaver modes
 */
class ScreensaverMode {
  constructor(options = {}) {
    this.running = false;
    this.options = options;
    this.intervalId = null;
  }

  /**
   * Start the screensaver mode
   */
  start() {
    if (this.running) return;
    this.running = true;
    
    // Override in subclasses
    console.log('Base screensaver mode started');
  }

  /**
   * Stop the screensaver mode
   */
  stop() {
    if (!this.running) return;
    this.running = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('Base screensaver mode stopped');
  }

  /**
   * Check if the mode is running
   */
  isRunning() {
    return this.running;
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = ScreensaverMode;
} else {
  window.ScreensaverMode = ScreensaverMode;
} 