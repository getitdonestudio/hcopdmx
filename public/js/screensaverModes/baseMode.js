/**
 * Base class for screensaver modes
 */
class ScreensaverMode {
  constructor(options = {}) {
    this.running = false;
    this.options = options;
    this.timers = {
      intervals: [],
      timeouts: []
    };
  }

  /**
   * Register an interval timer for automatic cleanup
   * @param {number} id - The interval ID returned by setInterval
   */
  registerInterval(id) {
    if (id) {
      this.timers.intervals.push(id);
    }
    return id;
  }

  /**
   * Register a timeout for automatic cleanup
   * @param {number} id - The timeout ID returned by setTimeout
   */
  registerTimeout(id) {
    if (id) {
      this.timers.timeouts.push(id);
    }
    return id;
  }

  /**
   * Clear all registered timers
   */
  clearAllTimers() {
    // Clear all interval timers
    while (this.timers.intervals.length > 0) {
      const intervalId = this.timers.intervals.pop();
      clearInterval(intervalId);
    }

    // Clear all timeout timers
    while (this.timers.timeouts.length > 0) {
      const timeoutId = this.timers.timeouts.pop();
      clearTimeout(timeoutId);
    }
  }

  /**
   * Start the screensaver mode
   */
  start() {
    if (this.running) return;
    this.running = true;
    
    // Base mode started - no logging needed here as specific modes will log
  }

  /**
   * Stop the screensaver mode
   */
  stop() {
    if (!this.running) return;
    
    // Clean up all timers
    this.clearAllTimers();
    
    this.running = false;
    // Base mode stopped - no logging needed here as specific modes will log
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
  
  /**
   * Safely handle DOM element updates
   * @param {string} elementId - The ID of the DOM element
   * @param {Function} updateFn - Function to call with the element
   * @returns {boolean} - Whether the update was successful
   */
  safelyUpdateElement(elementId, updateFn) {
    const element = document.getElementById(elementId);
    if (element) {
      updateFn(element);
      return true;
    }
    return false;
  }
  
  /**
   * Safe fetch with proper error handling
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise} - Promise with response or error
   */
  async safeFetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`[ScreensaverMode] Fetch error for ${url}:`, error);
      return { success: false, error };
    }
  }
}

// Export the class
if (typeof module !== 'undefined') {
  module.exports = ScreensaverMode;
} else {
  window.ScreensaverMode = ScreensaverMode;
} 