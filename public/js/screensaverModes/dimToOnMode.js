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
      lightPower: 255 // Default to full power
    });
    
    this.currentChannels = new Array(512).fill(0);
    this.targetChannels = new Array(512).fill(0); // Initialize to zeros, will set actual values later
    this.startTime = null;
    this.isTransitioning = false;
    this.updateCount = 0;
  }
  
  /**
   * Start the dim to on mode
   */
  async start() {
    console.log('DimToOnMode: Starting...');
    
    // Get current settings to update light power
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();
      if (settings.screensaver && settings.screensaver.lightPower !== undefined) {
        this.options.lightPower = settings.screensaver.lightPower;
        console.log(`DimToOnMode: Using screensaver light power: ${this.options.lightPower}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    
    // Fetch current DMX state
    try {
      const response = await fetch('/state');
      const data = await response.json();
      if (data.success && Array.isArray(data.channels)) {
        this.currentChannels = [...data.channels];
        console.log('DimToOnMode: Current state fetched, channel count:', this.currentChannels.length);
        
        // Set all channels to the target power
        this.targetChannels = new Array(this.currentChannels.length).fill(this.options.lightPower);
        console.log(`DimToOnMode: Setting all ${this.targetChannels.length} channels to target power: ${this.options.lightPower}`);
      }
    } catch (error) {
      console.error('Error fetching current DMX state:', error);
    }
    
    // Set up interval for updates
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(() => {
      this.update();
    }, this.options.updateInterval);
    
    this.startTime = Date.now();
    this.isTransitioning = true;
    this.updateCount = 0;
    
    console.log('DimToOnMode: Started transition with interval:', this.options.updateInterval);
    
    return super.start();
  }
  
  /**
   * Stop the dim to on mode
   */
  async stop() {
    console.log('DimToOnMode: Stopping...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isTransitioning = false;
    return super.stop();
  }
  
  /**
   * Update the dim to on mode
   */
  async update() {
    if (!this.isTransitioning) return;
    
    this.updateCount++;
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.options.transitionTime, 1);
    
    // Calculate current values with smooth easing
    const easedProgress = this.easeInOutCubic(progress);
    
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
      console.log(`DimToOnMode: Update #${this.updateCount}, progress: ${Math.round(progress * 100)}%`);
    }
    
    // Apply the current values
    await this.applyChannels(updatedChannels);
    
    // Check if transition is complete
    if (progress >= 1) {
      console.log('DimToOnMode: Transition complete after', this.updateCount, 'updates');
      this.isTransitioning = false;
      
      // Ensure we reach the exact target values
      await this.applyChannels(this.targetChannels);
      
      // Clear the interval now that transition is complete
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  }
  
  // Smooth easing function
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
      console.error('Error applying channels:', error);
    }
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = DimToOnMode;
} else {
  window.DimToOnMode = DimToOnMode;
} 