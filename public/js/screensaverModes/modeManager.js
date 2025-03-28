/**
 * Screensaver Mode Manager
 * Manages the different screensaver modes
 */
class ScreensaverModeManager {
  constructor() {
    // Available modes
    this.modes = {
      dimToOn: null,   // Just dim to all on (built-in)
      dimToOff: null,  // Just dim to all off (built-in)
      pulsating: null, // Pulsating mode
      cycling: null,   // Cycling mode
      disco: null      // Disco mode - fast random changes
    };
    
    this.activeMode = null;
    this.activeModeKey = null;
  }
  
  /**
   * Initialize the mode manager
   */
  initialize() {
    // Initialize the pulsating mode
    this.modes.pulsating = new PulsatingMode();
    
    // Initialize the cycling mode
    this.modes.cycling = new CyclingMode();
    
    // Initialize the disco mode
    this.modes.disco = new DiscoMode();
    
    console.log('Screensaver mode manager initialized');
  }
  
  /**
   * Start a specific mode
   * @param {string} modeKey - The mode to start (dimToOn, dimToOff, pulsating, cycling, disco)
   */
  startMode(modeKey) {
    // Stop any active mode
    this.stopActiveMode();
    
    // Remember the active mode
    this.activeModeKey = modeKey;
    
    // Handle built-in modes
    if (modeKey === 'dimToOn') {
      // This is handled by the main code - just set the flag
      console.log('Starting built-in mode: dimToOn');
      return;
    }
    
    if (modeKey === 'dimToOff') {
      // This is handled by the main code - just set the flag
      console.log('Starting built-in mode: dimToOff');
      return;
    }
    
    // Handle dynamic modes
    const mode = this.modes[modeKey];
    if (mode) {
      this.activeMode = mode;
      mode.start();
      console.log(`Started screensaver mode: ${modeKey}`);
    } else {
      console.error(`Unknown screensaver mode: ${modeKey}`);
    }
  }
  
  /**
   * Stop the active mode
   */
  stopActiveMode() {
    if (this.activeMode && this.activeMode.isRunning()) {
      this.activeMode.stop();
      console.log(`Stopped screensaver mode: ${this.activeModeKey}`);
    }
    
    this.activeMode = null;
    this.activeModeKey = null;
  }
  
  /**
   * Get the active mode key
   */
  getActiveModeKey() {
    return this.activeModeKey;
  }
}

// Create a singleton instance
const screensaverModeManager = new ScreensaverModeManager();

// Export the instance
if (typeof module !== 'undefined') {
  module.exports = screensaverModeManager;
} else {
  window.screensaverModeManager = screensaverModeManager;
} 