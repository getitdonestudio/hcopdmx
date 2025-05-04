/**
 * Dim to On Screensaver Mode
 * Smoothly dims all channels to full power
 */
class DimToOnMode extends ScreensaverMode {
  constructor(options = {}) {
    super({
      ...options,
      updateInterval: 50, // Update every 50ms for smooth transition
      transitionTime: 5000, // 5 seconds transition
      lightPower: 255, // Default to full power
      heartbeatInterval: 10000 // Heartbeat every 10 seconds
    });
    
    this.currentChannels = new Array(512).fill(0);
    this.targetChannels = new Array(512).fill(0); // Initialize to zeros, will set actual values later
    this.startTime = null;
    this.isTransitioning = false;
    this.updateCount = 0;
    this.heartbeatTimer = null;
  }
  
  /**
   * Start the dim to on mode
   */
  async start() {
    if (this.running) return;
    
    console.log('[DimToOnMode] Starting...');
    
    // Get current settings to update light power
    const settingsResponse = await this.safeFetch('/api/settings');
    if (settingsResponse.success) {
      const settings = settingsResponse.data;
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
        console.log(`[DimToOnMode] Using screensaver light power: ${this.options.lightPower}`);
      }
    }
    
    // Fetch current DMX state
    const stateResponse = await this.safeFetch('/state');
    if (stateResponse.success) {
      const data = stateResponse.data;
      this.currentChannels = [...data.channels];
      console.log('[DimToOnMode] Current state fetched, channel count:', this.currentChannels.length);
      
      // Set all channels to the target power
      this.targetChannels = new Array(this.currentChannels.length).fill(this.options.lightPower);
      console.log(`[DimToOnMode] Setting all ${this.targetChannels.length} channels to target power: ${this.options.lightPower}`);
    }
    
    // Set up interval for updates
    const intervalId = setInterval(() => {
      this.update();
    }, this.options.updateInterval);
    
    // Register interval for automatic cleanup
    this.registerInterval(intervalId);
    
    // Start heartbeat timer for keeping DMX interface active
    this.startHeartbeat();
    
    this.startTime = Date.now();
    this.isTransitioning = true;
    this.updateCount = 0;
    
    console.log('[DimToOnMode] Started transition with interval:', this.options.updateInterval);
    
    super.start();
    return true;
  }
  
  /**
   * Stop the dim to on mode
   */
  stop() {
    if (!this.running) return;
    
    console.log('[DimToOnMode] Stopping...');
    this.isTransitioning = false;
    
    // Clear heartbeat timer
    this.stopHeartbeat();
    
    // clearAllTimers is called by parent's stop() method
    super.stop();
    console.log('[DimToOnMode] Stopped');
    return true;
  }
  
  /**
   * Start heartbeat to keep DMX interface active
   */
  startHeartbeat() {
    // Clear any existing heartbeat
    this.stopHeartbeat();
    
    // Set up new heartbeat timer
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
    
    console.log(`[DimToOnMode] Heartbeat started with interval: ${this.options.heartbeatInterval}ms`);
  }
  
  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[DimToOnMode] Heartbeat stopped');
    }
  }
  
  /**
   * Send heartbeat signal to DMX interface
   */
  async sendHeartbeat() {
    if (!this.running) return;
    
    console.log('[DimToOnMode] Sending heartbeat to DMX interface');
    
    // If transition is complete, send the target values as heartbeat
    if (!this.isTransitioning) {
      await this.applyChannels(this.targetChannels);
    }
  }
  
  /**
   * Update the dim to on mode
   */
  async update() {
    if (!this.running || !this.isTransitioning) return;
    
    this.updateCount++;
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.options.transitionTime, 1);
    
    // Calculate current values with smooth easing
    const easedProgress = this.easeTransition(progress);
    
    // Create a new array for the updated values
    const updatedChannels = new Array(this.currentChannels.length).fill(0);
    
    // Update all channels
    for (let i = 0; i < updatedChannels.length; i++) {
      // Process all channels to transition to target power
      updatedChannels[i] = Math.round(
        this.currentChannels[i] + (this.targetChannels[i] - this.currentChannels[i]) * easedProgress
      );
    }
    
    // Log every 10th update for debugging
    if (this.updateCount % 10 === 0) {
      console.log(`[DimToOnMode] Update #${this.updateCount}, progress: ${Math.round(progress * 100)}%`);
    }
    
    // Apply the current values
    await this.applyChannels(updatedChannels);
    
    // Check if transition is complete
    if (progress >= 1) {
      console.log('[DimToOnMode] Transition complete after', this.updateCount, 'updates');
      this.isTransitioning = false;
      
      // Ensure we reach the exact target values
      await this.applyChannels(this.targetChannels);
      
      // No need to clear interval here as it will be cleaned up in stop()
    }
  }
  
  /**
   * Apply channels to DMX
   */
  async applyChannels(channels) {
    try {
      const response = await fetch('/dmx/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channels, useScreensaverPower: true })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error('Failed to apply channels');
      }
    } catch (error) {
      console.error('[DimToOnMode] Error applying channels:', error);
    }
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = DimToOnMode;
} else {
  window.DimToOnMode = DimToOnMode;
} 