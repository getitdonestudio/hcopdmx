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

  /**
   * Ease the transition progress for smooth dimming
   * Uses a cubic easing function for natural-feeling transitions
   */
  easeTransition(progress) {
    // Cubic easing function
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = ScreensaverMode;
} else {
  window.ScreensaverMode = ScreensaverMode;
} 