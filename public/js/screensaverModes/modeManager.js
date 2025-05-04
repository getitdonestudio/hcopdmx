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
   * @param {string} modeKey - The mode to start (dimToOn, dimToOff, disco)
   */
  async startMode(modeKey) {
    try {
      console.log(`[ScreensaverModeManager] Starting mode: ${modeKey}`);
      
      // Check if mode exists
      if (!this.modes[modeKey]) {
        console.error(`[ScreensaverModeManager] Mode not found: ${modeKey}`);
        
        // Log to server so we can track this issue
        try {
          await fetch('/api/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              level: 'error',
              message: `Screensaver mode not found: ${modeKey}`
            })
          });
        } catch (err) {
          console.error('[ScreensaverModeManager] Failed to log error to server:', err);
        }
        
        // Try to fall back to dimToOn
        modeKey = 'dimToOn';
        
        if (!this.modes[modeKey]) {
          console.error('[ScreensaverModeManager] Fallback mode also not found, aborting');
          return;
        }
      }
      
      // Stop any active mode
      this.stopActiveMode();
      
      // Remember the active mode
      this.activeModeKey = modeKey;
      
      // Reset the watchdog timer
      this.lastModeChangeTime = Date.now();
      
      // Get the mode object
      const mode = this.modes[modeKey];
      this.activeMode = mode;
      
      // Log to server/terminal before starting the mode
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            level: 'info',
            message: `Starting screensaver mode: ${modeKey.toUpperCase()}`
          })
        });
      } catch (err) {
        console.error('[ScreensaverModeManager] Failed to log to server:', err);
      }
      
      // Start the mode
      console.log(`[ScreensaverModeManager] Executing start method for mode: ${modeKey}`);
      try {
        // Handle async start method
        await mode.start();
        
        // Log success and reset error count
        console.log(`[ScreensaverModeManager] Successfully started mode: ${modeKey}`);
        this.errorCount = 0;
      } catch (error) {
        console.error(`[ScreensaverModeManager] Error during mode.start() for ${modeKey}:`, error);
        // Don't reset error count here, let it increment
        this.errorCount++;
        
        // If start failed, try a fallback
        if (modeKey !== 'dimToOn' && this.errorCount > this.maxErrors) {
          console.log('[ScreensaverModeManager] Too many errors, falling back to dimToOn mode');
          this.stopActiveMode();
          setTimeout(() => this.startMode('dimToOn'), 1000);
        }
      }
    } catch (error) {
      console.error(`[ScreensaverModeManager] Critical error starting mode ${modeKey}:`, error);
      
      // Try to log the error to the server
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            level: 'error',
            message: `Critical error in screensaver: ${error.message || 'Unknown error'}`
          })
        });
      } catch (err) {
        // Just log to console if server logging fails
        console.error('[ScreensaverModeManager] Failed to log critical error:', err);
      }
      
      // Fall back to dimToOn
      this.activeMode = null;
      this.activeModeKey = null;
      
      // Try again with the most basic mode
      setTimeout(() => {
        if (!this.activeMode) {
          this.startMode('dimToOn');
        }
      }, 2000);
    }
  }
  
  /**
   * Stop the active mode
   */
  stopActiveMode() {
    try {
      if (this.activeMode && this.activeMode.isRunning()) {
        console.log(`[ScreensaverModeManager] Stopping mode: ${this.activeModeKey}`);
        this.activeMode.stop();
        console.log(`[ScreensaverModeManager] Stopped mode: ${this.activeModeKey}`);
      }
    } catch (error) {
      console.error(`[ScreensaverModeManager] Error stopping mode ${this.activeModeKey}:`, error);
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
   * Clean up before page unload
   */
  cleanup() {
    this.stopActiveMode();
    this.stopWatchdog();
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