/**
 * Dim to Off Screensaver Mode
 * Smoothly dims all channels to zero
 */
class DimToOffMode extends ScreensaverMode {
  constructor(options = {}) {
    super(options);
    
    // Default options
    this.options = Object.assign({
      transitionTime: 2000, // Time to transition from current state to zero (2 seconds)
      updateInterval: 50, // Update interval (50ms = 20 times per second)
      lightPower: 255, // Default light power
      heartbeatInterval: 10000 // Heartbeat every 10 seconds
    }, options);
    
    this.currentChannels = null;
    this.targetChannels = null;
    this.transitionProgress = 0;
    this.transitionStartTime = 0;
    this.transitionTimer = null;
    this.heartbeatTimer = null;
  }
  
  /**
   * Start the dim to off mode
   */
  async start() {
    if (this.running) return;
    
    // Get current settings
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    
    super.start();
    
    // Get current state
    try {
      const response = await fetch('/state');
      if (!response.ok) {
        throw new Error(`Failed to load state: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to load state');
      }
      
      // Store current channels
      this.currentChannels = data.channels;
      
      // Create target channels (all at zero)
      this.targetChannels = Array(512).fill(0);
      
      // Start the transition
      this.startTransition();
      
      // Start heartbeat to keep DMX interface active
      this.startHeartbeat();
      
      console.log('Dim to off mode started');
    } catch (error) {
      console.error('Error starting dim to off mode:', error);
      // If we can't get the current state, start from all on
      this.currentChannels = Array(512).fill(this.options.lightPower);
      this.targetChannels = Array(512).fill(0);
      this.startTransition();
      this.startHeartbeat();
    }
  }
  
  /**
   * Stop the dim to off mode
   */
  stop() {
    if (!this.running) return;
    super.stop();
    
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }
    
    this.stopHeartbeat();
    
    console.log('Dim to off mode stopped');
  }
  
  /**
   * Start the transition
   */
  startTransition() {
    if (!this.currentChannels || !this.targetChannels || !this.running) return;
    
    this.transitionProgress = 0;
    this.transitionStartTime = Date.now();
    
    // Clear any existing transition timer
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
    }
    
    // Set up the transition timer
    this.transitionTimer = setInterval(() => {
      this.updateTransition();
    }, this.options.updateInterval);
  }
  
  /**
   * Update the transition progress
   */
  updateTransition() {
    if (!this.currentChannels || !this.targetChannels || !this.running) return;
    
    // Calculate progress (0-1)
    this.transitionProgress = Math.min(
      (Date.now() - this.transitionStartTime) / this.options.transitionTime,
      1
    );
    
    // Calculate current channels with easing
    const easedProgress = this.easeTransition(this.transitionProgress);
    const currentChannels = this.currentChannels.map((current, index) => {
      const target = this.targetChannels[index];
      if (current === 0 && target === 0) return 0; // Don't transition zero values
      return Math.round(current + (target - current) * easedProgress);
    });
    
    // Apply the channels directly
    this.applyChannels(currentChannels);
    
    // Check if transition is complete
    if (this.transitionProgress >= 1) {
      if (this.transitionTimer) {
        clearInterval(this.transitionTimer);
        this.transitionTimer = null;
      }
      console.log('Dim to off transition complete');
    }
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
    
    console.log(`[DimToOffMode] Heartbeat started with interval: ${this.options.heartbeatInterval}ms`);
  }
  
  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[DimToOffMode] Heartbeat stopped');
    }
  }
  
  /**
   * Send heartbeat signal to DMX interface
   */
  sendHeartbeat() {
    if (!this.running) return;
    
    console.log('[DimToOffMode] Sending heartbeat to DMX interface');
    
    // If transition is complete, send the target values as heartbeat
    if (this.transitionProgress >= 1 || !this.transitionTimer) {
      this.applyChannels(this.targetChannels);
    }
  }
  
  /**
   * Apply channels to DMX
   */
  applyChannels(channels) {
    fetch('/dmx/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channels })
    })
    .catch(error => {
      console.error('Error applying channels:', error);
    });
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = DimToOffMode;
} else {
  window.DimToOffMode = DimToOffMode;
} 