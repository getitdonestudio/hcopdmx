/**
 * Hypercube SPA - Main JavaScript
 * 
 * Handles content loading, DMX transitions, and UI interactions
 * without reloading the page.
 */

// SCREENSAVER FLAG - Set to true to enable, false to disable
const ENABLE_SCREENSAVER = true;

// Global state
let currentPage = null;
let currentLang = 'de';
let isLoadingContent = false;
let screensaverEnabled = ENABLE_SCREENSAVER; // Flag to enable/disable screensaver functionality
let screensaverTimeout = null;
let appSettings = {
  screensaver: {
    timeDelay: 120000, // Default 2 minutes
    mode: 'dimToOn',
    lightPower: 255,
    transitionSpeed: 1000
  }
};

// Constants
const dimmingDuration = 1000; // Duration for transitions in ms

// Mapping from keyboard keys to binary values
const keyToBinary = {
  a: '0000', b: '0001', c: '0010', d: '0011',
  e: '0100', f: '0101', g: '0110', h: '0111',
  i: '1000', j: '1001', k: '1010', l: '1011',
  m: '1100', n: '1101', o: '1110', p: '1111'
};

// Inverse mapping: Binary value -> key
const binaryToKey = {};
for (const key in keyToBinary) {
  binaryToKey[keyToBinary[key]] = key;
}

/**
 * Sets up keyboard event handlers in capture phase
 */
function captureKeyboardEvents() {
  document.addEventListener('keydown', function(event) {
    // In screensaver mode, handle key presses specially
    if (currentPage === 'screensaver') {
      event.preventDefault();
      event.stopPropagation();
      
      const key = event.key.toLowerCase();
      
      // If the key corresponds to a DMX program (a-p), go to that program
      if (keyToBinary.hasOwnProperty(key)) {
        console.log(`Key pressed in screensaver mode: ${key.toUpperCase()} - transitioning to page ${keyToBinary[key]}`);
        
        // Stop any active screensaver mode
        screensaverModeManager.stopActiveMode();
        
        // Transition to the page corresponding to this key's binary value
        transitionToPage(keyToBinary[key]);
        return;
      }
      
      // For other keys, return to the previous page
      console.log('Non-program key pressed in screensaver mode, returning to previous page');
      returnFromScreensaver();
      return;
    }
    
    const key = event.key.toLowerCase();
    
    // Prevent default for all DMX-related keys
    if (keyToBinary.hasOwnProperty(key) || key === 'q' || key === 'z') {
      event.preventDefault();
      event.stopPropagation();
      
      // If already processing, don't do anything
      if (isLoadingContent) return;
      
      // Handle A-P keys: direct DMX transition and content loading
      if (keyToBinary.hasOwnProperty(key)) {
        console.log(`Key pressed: ${key.toUpperCase()} - transitioning to page ${keyToBinary[key]}`);
        
        // Transition to the page corresponding to this key's binary value
        transitionToPage(keyToBinary[key]);
        return;
      }
      
      // For DMX-Steuerung: q (All On) und z (All Off)
      if (key === 'q') {
        console.log('Q key pressed - All On - transitioning to screensaver');
        transitionToScreensaver();
      } else if (key === 'z') {
        console.log('Z key pressed - All Off');
        
        // For Z, we just turn off the lights
        const statusElem = document.getElementById('status');
        if (statusElem) {
          statusElem.textContent = 'Schalte alle Lichter aus...';
        }
        sendDMXCommand('z')
          .then(() => {
            if (statusElem) {
              statusElem.textContent = 'Alle Lichter ausgeschaltet.';
            }
          });
      }
    }
    
    // Reset screensaver timer on any key press
    resetScreensaverTimer();
  }, true); // Use the capture phase to intercept events before they bubble
}

/**
 * Reset the screensaver timer - called on user activity
 */
function resetScreensaverTimer() {
  // Clear any existing timeout
  if (screensaverTimeout) {
    clearTimeout(screensaverTimeout);
    screensaverTimeout = null;
  }
  
  // If screensaver is disabled, don't set a new timeout
  if (!screensaverEnabled) return;
  
  // If we're already in screensaver mode, don't set a timer
  if (currentPage === 'screensaver') return;
  
  // Set a new timeout using the delay from settings
  screensaverTimeout = setTimeout(() => {
    transitionToScreensaver();
  }, appSettings.screensaver.timeDelay);
}

/**
 * Toggle screensaver functionality
 * @param {boolean} enable - Whether to enable the screensaver
 */
function toggleScreensaver(enable) {
  screensaverEnabled = enable;
  
  // If enabling, reset the timer
  if (screensaverEnabled) {
    resetScreensaverTimer();
  } else {
    // If disabling, clear any existing timeout
    if (screensaverTimeout) {
      clearTimeout(screensaverTimeout);
      screensaverTimeout = null;
    }
  }
  
  // Store preference in localStorage
  localStorage.setItem('screensaverEnabled', screensaverEnabled ? 'true' : 'false');
  
  console.log(`Screensaver ${screensaverEnabled ? 'aktiviert' : 'deaktiviert'}`);
}

/**
 * Update binary display based on current page
 */
function updateBinaryDisplay() {
  const binaryDisplay = document.getElementById('binaryDisplay');
  if (!binaryDisplay) return;
  
  const pageValue = document.body.getAttribute('data-page');
  if (!pageValue || pageValue.length !== 4) return;

  let html = '';
  for (let i = 0; i < pageValue.length; i++) {
    html += `<div class="binary-bit${pageValue[i] === '1' ? ' active' : ''}"></div>`;
  }
  binaryDisplay.innerHTML = html;
}

/**
 * Load content into the container without page refresh
 * @param {string} pageId - Page identifier (e.g., '0000', 'screensaver')
 * @param {string} lang - Language code ('de' or 'en')
 * @returns {Promise<boolean>} - Success status
 */
async function loadContent(pageId, lang = currentLang) {
  if (isLoadingContent) return false;
  isLoadingContent = true;
  
  const container = document.getElementById('content-container');
  if (!container) {
    isLoadingContent = false;
    return false;
  }
  
  // Show loading state - but with minimal visual change
  container.classList.add('loading');
  
  try {
    // Log what we're doing
    console.log(`Loading content: ${lang}/${pageId}.html`);
    
    // First, check if the content exists
    const response = await fetch(`/content/${lang}/${pageId}.html`);
    
    if (!response.ok) {
      console.error(`Failed to load page: ${pageId}`);
      container.innerHTML = `<div class="error">Error loading content. Please try again.</div>`;
      isLoadingContent = false;
      return false;
    }
    
    const html = await response.text();
    // Apply content directly without animations
    container.innerHTML = html;
    
    // Update state and attributes
    currentPage = pageId;
    currentLang = lang;
    document.body.setAttribute('data-lang', lang);
    document.body.setAttribute('data-page', pageId);
    
    // Store current language in sessionStorage for the settings page
    sessionStorage.setItem('currentLang', lang);
    
    // Update classes based on page type
    if (pageId === 'screensaver') {
      document.body.classList.add('screensaver');
    } else {
      document.body.classList.remove('screensaver');
    }
    
    // Update the URL without page refresh (using replaceState to avoid popstate triggering)
    const newUrl = `/${lang}/${pageId}.html`;
    window.history.replaceState({page: pageId, lang}, '', newUrl);
    
    // Update binary display
    updateBinaryDisplay();
    
    // Update settings link to match the current language
    updateSettingsLink();
    
    // Restore normal state without animation
    container.classList.remove('loading');
    isLoadingContent = false;
    return true;
  } catch (error) {
    console.error('Error loading content:', error);
    container.innerHTML = `<div class="error">Error loading content: ${error.message}</div>`;
    container.classList.remove('loading');
    isLoadingContent = false;
    return false;
  }
}

/**
 * Execute a direct DMX program change without transitions
 * @param {string} key - The DMX program key to set
 * @returns {Promise<boolean>} - Success status
 */
async function sendDMXCommand(key) {
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = `Sende Programm ${key.toUpperCase()}...`;
  }
  
  console.log(`Sending DMX program: ${key.toUpperCase()}`);
  
  try {
    const response = await fetch(`/dmx/${key}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (statusElem) {
      statusElem.textContent = data.success ? 
        `Programm ${key.toUpperCase()} aktiviert.` : 
        `Fehler: ${data.message}`;
    }
    
    console.log(`DMX command result: ${data.success}`);
    return data.success;
  } catch (error) {
    console.error('DMX command error:', error);
    if (statusElem) {
      statusElem.textContent = 'Fehler beim Senden des Befehls.';
    }
    return false;
  }
}

/**
 * Execute a DMX program change with smooth transition/fade
 * @param {string} key - The DMX program key to set
 * @param {number} duration - Duration of the fade in ms (default: from settings)
 * @returns {Promise<boolean>} - Success status
 */
async function sendDMXFadeCommand(key, duration) {
  // If no duration provided, use the one from settings
  if (duration === undefined) {
    duration = appSettings.screensaver.transitionSpeed;
  }

  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = `Fade zu Programm ${key.toUpperCase()}...`;
  }
  
  console.log(`Sending DMX fade to program: ${key.toUpperCase()} over ${duration}ms`);
  
  try {
    const response = await fetch(`/dmx/fade/${key}?duration=${duration}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (statusElem) {
      statusElem.textContent = data.success ? 
        `Fade zu Programm ${key.toUpperCase()} abgeschlossen.` : 
        `Fehler: ${data.message}`;
    }
    
    console.log(`DMX fade command result: ${data.success}`);
    return data.success;
  } catch (error) {
    console.error('DMX fade command error:', error);
    if (statusElem) {
      statusElem.textContent = 'Fehler beim Senden des Fade-Befehls.';
    }
    return false;
  }
}

/**
 * Perform a direct page transition
 * @param {string} pageId - Target page ID
 * @returns {Promise<void>}
 */
async function transitionToPage(pageId) {
  if (isLoadingContent || pageId === currentPage) return;
  
  console.log(`Starting page transition to ${pageId}`);
  
  // Get the DMX key for this page
  const targetKey = binaryToKey[pageId];
  
  if (!targetKey) {
    console.error(`No DMX mapping found for page ${pageId}`);
    return;
  }
  
  // Show status update
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = `Wechsle zu Programm ${targetKey.toUpperCase()}...`;
  }
  
  try {
    // 1. Load the new content
    const contentLoaded = await loadContent(pageId);
    
    // 2. Send the DMX command to change lights
    if (contentLoaded) {
      await sendDMXCommand(targetKey);
    }
    
    console.log(`Transition to page ${pageId} completed`);
  } catch (error) {
    console.error(`Error during transition:`, error);
  }
}

/**
 * Update the status text in the UI
 * @param {string} message - The status message to display
 */
function updateStatus(message) {
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = message;
  }
}

/**
 * Transition to screensaver mode
 */
function transitionToScreensaver() {
  if (currentPage === 'screensaver') return;
  
  // Store the last page before screensaver
  sessionStorage.setItem('lastPage', currentPage);
  console.log('Transitioning to screensaver, last page was:', currentPage);
  
  // Update UI to show screensaver mode
  document.body.classList.add('screensaver');
  previousPage = currentPage;
  currentPage = 'screensaver';
  
  // Reset font size to default when entering screensaver
  resetFontSize();
  
  // Load the screensaver content
  loadContent('screensaver', currentLang);
  
  // Get chosen screensaver mode from settings
  fetch('/api/settings')
    .then(response => response.json())
    .then(settings => {
      const modeKey = settings.screensaver.mode || 'dimToOn';
      console.log(`Starting screensaver mode: ${modeKey}`);
      
      updateStatus('Screensaver aktiviert...');
      
      // Handle built-in modes directly
      if (modeKey === 'dimToOn') {
        // Transition all lights to full on
        const duration = settings.screensaver.transitionSpeed || 1000;
        sendDMXFadeCommand('q', duration)
          .then(() => {
            updateStatus('Screensaver: Alle Lichter an');
          });
      } else if (modeKey === 'dimToOff') {
        // Transition all lights to off
        const duration = settings.screensaver.transitionSpeed || 1000;
        sendDMXFadeCommand('z', duration)
          .then(() => {
            updateStatus('Screensaver: Alle Lichter aus');
          });
      } else {
        // Start other modes through the mode manager
        screensaverModeManager.startMode(modeKey);
      }
    })
    .catch(error => {
      console.error('Error fetching settings:', error);
      updateStatus('Fehler beim Starten des Bildschirmschoners');
    });
}

/**
 * Return from screensaver to previous page
 * @returns {Promise<void>}
 */
async function returnFromScreensaver() {
  if (currentPage !== 'screensaver' || isLoadingContent) return;
  
  console.log("Starting return from screensaver");
  
  // Get the last page we were on
  const lastPage = sessionStorage.getItem('lastPage') || '0000';
  const targetDMXKey = binaryToKey[lastPage];
  
  if (!targetDMXKey) {
    console.error(`No DMX mapping found for page ${lastPage}`);
    return;
  }
  
  // Stop any active screensaver mode
  screensaverModeManager.stopActiveMode();
  
  // Status update
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = 'Lade vorherige Seite...';
  }
  
  try {
    // Load the content for the previous page
    const contentLoaded = await loadContent(lastPage);
    
    // Send the DMX command for that page without fade
    if (contentLoaded) {
      await sendDMXCommand(targetDMXKey);
    }
    
    if (statusElem) {
      statusElem.textContent = `Programm ${targetDMXKey.toUpperCase()} aktiv.`;
    }
    
    console.log("Return from screensaver completed");
  } catch (error) {
    console.error(`Error returning from screensaver:`, error);
  }
}

// Handle all click events globally to prevent navigation
document.addEventListener('click', function(event) {
  // Reset screensaver timer on any click
  resetScreensaverTimer();
  
  // Find if this is a navigation link
  const link = event.target.closest('a');
  if (link && link.getAttribute('href')) {
    // Always prevent default navigation
    event.preventDefault();
    event.stopPropagation();
    
    const href = link.getAttribute('href');
    
    // Return from screensaver on click anywhere when in screensaver mode
    if (currentPage === 'screensaver') {
      console.log('Screensaver clicked, returning to previous page');
      returnFromScreensaver();
      return;
    }
    
    // Handle language switcher clicks
    if (link.closest('.language-switcher')) {
      const clickedLang = link.getAttribute('data-lang');
      if (clickedLang && clickedLang !== currentLang) {
        console.log(`Language switched to: ${clickedLang}`);
        loadContent(currentPage, clickedLang);
      }
      return;
    }
    
    // Handle "All On" button clicks
    if (link.id === 'all-on' || href.includes('screensaver')) {
      console.log('All On button clicked, transitioning to screensaver');
      transitionToScreensaver();
      return;
    }
    
    // Handle "All Off" button clicks
    if (link.id === 'all-off' || href.includes('all-off')) {
      console.log('All Off button clicked, dimming to zero');
      sendDMXCommand('z');
      return;
    }
    
    // Check if this is an internal spa navigation link
    if ((href.startsWith('/spa/') || href.match(/^\/[a-z]{2}\//i)) && href.endsWith('.html')) {
      // Extract pageId from href (e.g., "0000" from "/de/0000.html")
      const urlParts = href.split('/');
      const pageFile = urlParts[urlParts.length - 1];
      const pageId = pageFile.replace('.html', '');
      
      // Set language if present in URL
      if (urlParts.length > 2) {
        // Language is second to last part in URL path
        // For /spa/de/0000.html, language is at index 2
        // For /de/0000.html, language is at index 1
        const langIndex = href.startsWith('/spa/') ? 2 : 1;
        const lang = urlParts[langIndex];
        if (lang && (lang === 'de' || lang === 'en') && lang !== currentLang) {
          currentLang = lang;
        }
      }
      
      // Transition to the new page without page navigation
      transitionToPage(pageId);
    }
  } else if (currentPage === 'screensaver') {
    // Return from screensaver even if clicking on a non-link element
    console.log('Screensaver clicked (non-link), returning to previous page');
    returnFromScreensaver();
    return;
  }
}, true); // Use capture phase

// Add mouse movement handler for screensaver
let lastMouseMoveTime = 0;
let mouseMoveCount = 0;
document.addEventListener('mousemove', function() {
  const now = Date.now();
  mouseMoveCount++;
  
  // Only reset the timer if it's been at least 5 seconds since the last reset
  // to avoid constant resets from rapid mouse movements
  if (now - lastMouseMoveTime > 5000) {
    lastMouseMoveTime = now;
    mouseMoveCount = 0;
    resetScreensaverTimer();
  }
});

/**
 * Load settings from the server
 */
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      console.error('Failed to load settings');
      return;
    }
    
    const settings = await response.json();
    appSettings = settings;
    console.log('Settings loaded successfully:', appSettings);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Update the settings link to match the current language
 */
function updateSettingsLink() {
  const settingsLink = document.getElementById('settingsLink');
  if (settingsLink) {
    settingsLink.href = `/settings.html`;
  }
}

/**
 * Initialize font size controls
 */
function initFontSizeControls() {
  const fontSizeToggle = document.getElementById('fontSizeToggle');
  const decreaseFontSize = document.getElementById('decreaseFontSize');
  const increaseFontSize = document.getElementById('increaseFontSize');
  const fontSizeOptions = document.querySelector('.font-size-options');
  
  if (!fontSizeToggle || !fontSizeOptions) return;
  
  // Toggle expanded state
  fontSizeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fontSizeOptions.classList.toggle('expanded');
  });
  
  // Close when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.font-size-icon') && !event.target.closest('.font-size-options')) {
      fontSizeOptions.classList.remove('expanded');
    }
  });
  
  // Handle font size decrease
  decreaseFontSize.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentSize = parseInt(document.body.getAttribute('data-font-size') || '2');
    if (currentSize > 1) {
      setFontSize(currentSize - 1);
    }
  });
  
  // Handle font size increase
  increaseFontSize.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentSize = parseInt(document.body.getAttribute('data-font-size') || '2');
    if (currentSize < 5) {
      setFontSize(currentSize + 1);
    }
  });
}

/**
 * Set the font size and save it to session storage
 * @param {number} size - Size level (1-5)
 */
function setFontSize(size) {
  document.body.setAttribute('data-font-size', size);
  sessionStorage.setItem('fontSizePreference', size);
}

/**
 * Load saved font size from session storage
 */
function loadSavedFontSize() {
  const savedSize = sessionStorage.getItem('fontSizePreference');
  if (savedSize) {
    document.body.setAttribute('data-font-size', savedSize);
  }
}

/**
 * Reset font size to default
 */
function resetFontSize() {
  setFontSize(2); // Default size
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  
  // Load settings first
  await loadSettings();
  
  // Parse the initial URL to determine current page
  const pathname = window.location.pathname;
  const match = pathname.match(/\/([a-z]{2})\/([a-z0-9]+)\.html$/i);
  
  if (match) {
    currentLang = match[1];
    currentPage = match[2];
  } else {
    currentLang = 'de';
    currentPage = '0000';
  }
  
  // Set up all event handlers
  captureKeyboardEvents();
  
  // Load screensaver preference from localStorage
  const savedScreensaverPref = localStorage.getItem('screensaverEnabled');
  if (savedScreensaverPref !== null) {
    screensaverEnabled = savedScreensaverPref === 'true';
  }
  
  // Set initial attributes
  document.body.setAttribute('data-lang', currentLang);
  document.body.setAttribute('data-page', currentPage);
  
  // Initialize based on current page
  if (currentPage === 'screensaver') {
    document.body.classList.add('screensaver');
    // Start with all lights on for screensaver
    sendDMXCommand('q');
  } else if (binaryToKey[currentPage]) {
    // Initialize to the DMX program matching the page
    sendDMXCommand(binaryToKey[currentPage]);
  }
  
  // Initialize binary display
  updateBinaryDisplay();
  
  // Load initial content if needed
  loadContent(currentPage, currentLang);
  
  // Initialize the screensaver mode manager
  if (window.screensaverModeManager) {
    screensaverModeManager.initialize();
  }
  
  // Start screensaver timer if enabled
  if (screensaverEnabled && currentPage !== 'screensaver') {
    resetScreensaverTimer();
  }
  
  // Update settings link
  updateSettingsLink();
  
  // Initialize font size controls
  initFontSizeControls();
  
  // Load saved font size
  loadSavedFontSize();
}); 