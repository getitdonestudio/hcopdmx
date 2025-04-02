/**
 * Screensaver Mode Manager
 * Manages the different screensaver modes
 */
class ScreensaverModeManager {
  constructor() {
    // Available modes
    this.modes = {
      dimToOn: null,   // Dim to all on mode
      dimToOff: null,  // Dim to all off mode
      pulsating: null, // Pulsating mode
      cycling: null,   // Cycling mode
      disco: null      // Disco mode - fast random changes
    };
    
    this.activeMode = null;
    this.activeModeKey = null;
    
    // Watchdog to detect and recover from stuck modes
    this.watchdogTimer = null;
    this.lastModeChangeTime = 0;
    this.watchdogTimeout = 120000; // 2 minutes
    
    // Error tracking
    this.errorCount = 0;
    this.maxErrors = 3;
  }
  
  /**
   * Initialize the mode manager
   */
  initialize() {
    try {
      // Initialize the dim to on mode
      this.modes.dimToOn = new DimToOnMode();
      
      // Initialize the dim to off mode
      this.modes.dimToOff = new DimToOffMode();
      
      // Initialize the pulsating mode
      this.modes.pulsating = new PulsatingMode();
      
      // Initialize the cycling mode
      this.modes.cycling = new CyclingMode();
      
      // Initialize the disco mode
      this.modes.disco = new DiscoMode();
      
      // Start the watchdog
      this.startWatchdog();
      
      console.log('Screensaver mode manager initialized');
    } catch (error) {
      console.error('Error initializing screensaver mode manager:', error);
    }
  }
  
  /**
   * Start the watchdog timer to detect stuck modes
   */
  startWatchdog() {
    // Clear any existing watchdog
    this.stopWatchdog();
    
    // Set the current time as the last mode change time
    this.lastModeChangeTime = Date.now();
    
    // Start the watchdog timer
    this.watchdogTimer = setInterval(() => {
      this.checkActiveMode();
    }, 30000); // Check every 30 seconds
    
    console.log('Screensaver watchdog started');
  }
  
  /**
   * Stop the watchdog timer
   */
  stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
  
  /**
   * Check if the active mode is working properly
   */
  checkActiveMode() {
    // Only check if we have an active mode
    if (!this.activeMode || !this.activeModeKey) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastChange = now - this.lastModeChangeTime;
    
    // If it's been too long since the last mode change or update, restart the mode
    if (timeSinceLastChange > this.watchdogTimeout) {
      console.warn(`Watchdog detected potential stuck mode: ${this.activeModeKey}. Restarting...`);
      
      // Record the error
      this.errorCount++;
      
      // Attempt to restart the mode
      this.restartActiveMode();
      
      // Reset the timer
      this.lastModeChangeTime = now;
    }
  }
  
  /**
   * Restart the active mode to recover from issues
   */
  restartActiveMode() {
    if (!this.activeMode || !this.activeModeKey) {
      return;
    }
    
    try {
      // If we've exceeded the max error count, try a different mode
      if (this.errorCount > this.maxErrors) {
        console.warn(`Too many errors with mode ${this.activeModeKey}, switching to a different mode`);
        
        // Switch to a different mode
        let newModeKey = this.activeModeKey;
        const modeKeys = Object.keys(this.modes).filter(key => 
          key !== 'dimToOn' && key !== 'dimToOff' && this.modes[key]
        );
        
        if (modeKeys.length > 1) {
          while (newModeKey === this.activeModeKey && modeKeys.length > 1) {
            const randomIndex = Math.floor(Math.random() * modeKeys.length);
            newModeKey = modeKeys[randomIndex];
          }
        }
        
        // Stop the current mode
        this.stopActiveMode();
        
        // Start the new mode
        this.startMode(newModeKey);
        
        // Reset error count
        this.errorCount = 0;
      } else {
        // Stop and restart the current mode
        const currentModeKey = this.activeModeKey;
        this.stopActiveMode();
        
        // Wait a short time before restarting
        setTimeout(() => {
          if (!this.activeMode) { // Only restart if no other mode has been started
            this.startMode(currentModeKey);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error restarting mode:', error);
      
      // If all else fails, try to default to dimToOn
      setTimeout(() => {
        if (!this.activeMode) {
          this.startMode('dimToOn');
        }
      }, 2000);
    }
  }
  
  /**
   * Start a specific mode
   * @param {string} modeKey - The mode to start (dimToOn, dimToOff, pulsating, cycling, disco)
   */
  startMode(modeKey) {
    try {
      // Stop any active mode
      this.stopActiveMode();
      
      // Remember the active mode
      this.activeModeKey = modeKey;
      
      // Reset the watchdog timer
      this.lastModeChangeTime = Date.now();
      
      // Handle all modes through the mode objects
      const mode = this.modes[modeKey];
      if (mode) {
        this.activeMode = mode;
        mode.start();
        console.log(`Started screensaver mode: ${modeKey}`);
        
        // Reset error count when successfully starting a mode
        this.errorCount = 0;
      } else {
        console.error(`Unknown screensaver mode: ${modeKey}`);
        // Try to fall back to dimToOn
        this.activeModeKey = 'dimToOn';
        this.startMode('dimToOn');
      }
    } catch (error) {
      console.error(`Error starting mode ${modeKey}:`, error);
      // Fall back to dimToOn
      this.activeMode = null;
      this.activeModeKey = 'dimToOn';
      this.startMode('dimToOn');
    }
  }
  
  /**
   * Stop the active mode
   */
  stopActiveMode() {
    try {
      if (this.activeMode && this.activeMode.isRunning()) {
        this.activeMode.stop();
        console.log(`Stopped screensaver mode: ${this.activeModeKey}`);
      }
    } catch (error) {
      console.error(`Error stopping mode ${this.activeModeKey}:`, error);
    } finally {
      // Always reset the state even if there's an error
      this.activeMode = null;
      this.activeModeKey = null;
    }
  }
  
  /**
   * Get the active mode key
   */
  getActiveModeKey() {
    return this.activeModeKey;
  }
  
  /**
   * Clean up resources when done
   */
  cleanup() {
    this.stopActiveMode();
    this.stopWatchdog();
    console.log('Screensaver mode manager cleaned up');
  }
}

// Create a singleton instance
const screensaverModeManager = new ScreensaverModeManager();

// Ensure cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    screensaverModeManager.cleanup();
  });
}

// Export the instance
if (typeof module !== 'undefined') {
  module.exports = screensaverModeManager;
} else {
  window.screensaverModeManager = screensaverModeManager;
} 