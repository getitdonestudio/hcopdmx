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
  },
  lightPower: 255,
  linkLightPowers: true
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
    
    // Extended range of DMX-related keys: a-p, q, r-x, y, z
    if (keyToBinary.hasOwnProperty(key) || key === 'q' || 
        (key >= 'r' && key <= 'x') || key === 'y' || key === 'z') {
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
      
      // Special keys: q (screensaver), r-x (direct DMX commands), y (all on), z (all off)
      if (key === 'q') {
        console.log('Q key pressed - activating screensaver');
        transitionToScreensaver();
      } else if (key >= 'r' && key <= 'x') {
        console.log(`${key.toUpperCase()} key pressed - sending direct DMX command`);
        
        // For R-X, we send direct DMX commands without page navigation
        const statusElem = document.getElementById('status');
        if (statusElem) {
          statusElem.textContent = `Sende DMX-Befehl ${key.toUpperCase()}...`;
        }
        sendDMXCommand(key)
          .then(() => {
            if (statusElem) {
              statusElem.textContent = `DMX-Befehl ${key.toUpperCase()} gesendet.`;
            }
          });
      } else if (key === 'y') {
        console.log('Y key pressed - All On (without page navigation)');
        
        // For Y, we just turn on all lights without page navigation
        const statusElem = document.getElementById('status');
        if (statusElem) {
          statusElem.textContent = 'Schalte alle Lichter ein...';
        }
        sendDMXCommand('y')
          .then(() => {
            if (statusElem) {
              statusElem.textContent = 'Alle Lichter eingeschaltet.';
            }
          });
      } else if (key === 'z') {
        console.log('Z key pressed - All Off (without page navigation)');
        
        // For Z, we just turn off the lights without page navigation
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
 * Reload settings from the server
 * This can be called any time settings might have changed
 */
async function reloadSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      console.error('Failed to reload settings');
      return false;
    }
    
    const settings = await response.json();
    appSettings = settings;
    console.log('Settings reloaded successfully:', appSettings);
    
    // Update screensaver timer with new timeout
    resetScreensaverTimer();
    
    return true;
  } catch (error) {
    console.error('Error reloading settings:', error);
    return false;
  }
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
    
    // Initialize KaTeX if it exists on the page
    initKaTeXIfNeeded();
    
    // Initialize accordions if the accordion script is loaded
    if (typeof initAccordions === 'function') {
      initAccordions();
    }
    
    // Verhindere Satzzeichen am Anfang neuer Zeilen, falls die Funktion verfügbar ist
    if (typeof preventPunctuationAtLineStart === 'function') {
      preventPunctuationAtLineStart();
    }
    
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
      
      // Reset screensaver timer when loading a regular page (not screensaver)
      // We need this check to avoid circular resets
      if (screensaverEnabled && !isLoadingContent) {
        resetScreensaverTimer();
      }
    }
    
    // Update the URL without page refresh (using replaceState to avoid popstate triggering)
    const newUrl = `/${lang}/${pageId}.html`;
    window.history.replaceState({page: pageId, lang}, '', newUrl);
    
    // Update binary display
    updateBinaryDisplay();
    
    // Update settings link to match the current language
    updateSettingsLink();
    
    // Scroll to top of the page when content changes
    window.scrollTo(0, 0);
    
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
 * Initialize KaTeX renderer if needed
 * This is called after loading new content to render math formulas
 */
function initKaTeXIfNeeded() {
  // Check if KaTeX is available
  if (typeof renderMathInElement === 'function') {
    try {
      // Apply KaTeX rendering to the content container
      renderMathInElement(document.getElementById('content-container'), {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\begin{equation*}', right: '\\end{equation*}', display: true}
        ],
        throwOnError: false
      });
      console.log('KaTeX rendering applied');
    } catch (e) {
      console.error('Error initializing KaTeX:', e);
    }
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
  } else {
    console.warn('[Main] Status element not found when updating status:', message);
  }
}

/**
 * Execute a DMX program change (direct)
 * @param {string} key - The DMX program key to set
 * @returns {Promise<boolean>} - Success status
 */
async function sendDMXCommand(key) {
  try {
    updateStatus(`Setze Programm ${key.toUpperCase()}...`);
    console.log(`[Main] Sending DMX command: ${key.toUpperCase()}`);
    
    const response = await fetch(`/dmx/${key}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      updateStatus(`Programm ${key.toUpperCase()} aktiv`);
      console.log(`[Main] DMX command success: ${key.toUpperCase()}`);
      return true;
    } else {
      updateStatus(`Fehler: ${data.message || 'Unbekannter Fehler'}`);
      console.error(`[Main] DMX command failed: ${key.toUpperCase()}`, data.message);
      return false;
    }
  } catch (error) {
    updateStatus('Fehler beim Senden des DMX-Befehls');
    console.error('[Main] DMX command error:', error);
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
  try {
    // If no duration provided, use the one from settings
    const effectiveDuration = duration || appSettings.screensaver.transitionSpeed || 1000;
    
    updateStatus(`Fade zu Programm ${key.toUpperCase()}...`);
    console.log(`[Main] Sending DMX fade to program: ${key.toUpperCase()} over ${effectiveDuration}ms`);
    
    // Build URL with parameters
    const params = new URLSearchParams();
    params.append('duration', effectiveDuration);
    
    const response = await fetch(`/dmx/fade/${key}?${params}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      updateStatus(`Fade zu Programm ${key.toUpperCase()} abgeschlossen`);
      console.log(`[Main] DMX fade command success: ${key.toUpperCase()}`);
      return true;
    } else {
      updateStatus(`Fehler: ${data.message || 'Unbekannter Fehler'}`);
      console.error(`[Main] DMX fade command failed: ${key.toUpperCase()}`, data.message);
      return false;
    }
  } catch (error) {
    updateStatus('Fehler beim Senden des Fade-Befehls');
    console.error('[Main] DMX fade command error:', error);
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
    
    // 3. Reset the screensaver timer when a new page is loaded
    resetScreensaverTimer();
    
    console.log(`Transition to page ${pageId} completed`);
  } catch (error) {
    console.error(`Error during transition:`, error);
  }
}

/**
 * Transition to screensaver mode
 */
async function transitionToScreensaver() {
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
  
  try {
    // Get chosen screensaver mode from settings
    const response = await fetch('/api/settings');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const settings = await response.json();
    const modeKey = settings.screensaver.mode || 'dimToOn';
    const lightPower = settings.screensaver.lightPower || 255;
    const transitionSpeed = settings.screensaver.transitionSpeed || 1000;
    console.log(`Starting screensaver mode: ${modeKey} with light power: ${lightPower}`);
    
    updateStatus('Screensaver aktiviert...');
    
    // Use the mode manager for all modes including built-in ones
    if (typeof screensaverModeManager !== 'undefined') {
      try {
        // First make sure any existing mode is stopped
        screensaverModeManager.stopActiveMode();
        
        // Start the selected mode
        console.log('Starting screensaver mode via mode manager:', modeKey);
        await screensaverModeManager.startMode(modeKey);
        console.log('Screensaver mode started successfully');
      } catch (error) {
        console.error('Error starting screensaver mode via manager:', error);
        // Fall back to direct implementation
        fallbackScreensaver(modeKey, lightPower, transitionSpeed);
      }
    } else {
      console.error('Screensaver mode manager not found! Falling back to direct implementation.');
      fallbackScreensaver(modeKey, lightPower, transitionSpeed);
    }
  } catch (error) {
    console.error('Error starting screensaver:', error);
    updateStatus('Fehler beim Starten des Bildschirmschoners');
  }
}

/**
 * Fallback implementation for screensaver mode when the mode manager fails
 * @param {string} modeKey - The screensaver mode (dimToOn, dimToOff, etc.)
 * @param {number} lightPower - The light power level (0-255)
 * @param {number} transitionSpeed - Transition speed in ms
 */
async function fallbackScreensaver(modeKey, lightPower, transitionSpeed) {
  if (modeKey === 'dimToOff') {
    // Transition all lights to off
    try {
      await sendDMXFadeCommand('z', transitionSpeed);
      updateStatus('Screensaver: Alle Lichter aus');
    } catch (error) {
      console.error('Error sending DMX fade command:', error);
      updateStatus('Fehler beim Dimmen der Lichter');
    }
  } else {
    // Default to dimToOn behavior
    try {
      const response = await fetch('/state');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Set all channels to the screensaver power level
        const channels = new Array(data.channels.length).fill(lightPower);
        
        // Send with fade
        const result = await fetch('/dmx/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channels: channels,
            useScreensaverPower: true
          })
        }).then(res => res.json());
        
        if (result.success) {
          updateStatus('Screensaver: Alle Lichter gedimmt');
        } else {
          updateStatus('Fehler beim Dimmen der Lichter');
        }
      }
    } catch (error) {
      console.error('Error in fallback screensaver:', error);
      updateStatus('Fehler beim Dimmen der Lichter');
    }
  }
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
  console.log(`Last page was: ${lastPage}`);
  
  let targetDMXKey = binaryToKey[lastPage];
  
  if (!targetDMXKey) {
    console.error(`No DMX mapping found for page ${lastPage}, falling back to 'a'`);
    // Default to program 'a' if no mapping found
    targetDMXKey = 'a';
  }
  
  try {
    // Stop any active screensaver mode
    if (typeof screensaverModeManager !== 'undefined') {
      console.log("Stopping active screensaver mode");
      screensaverModeManager.stopActiveMode();
    } else {
      console.error("Screensaver mode manager not available for cleanup");
    }
    
    // Update status
    updateStatus('Lade vorherige Seite...');
    
    // Load the content for the previous page
    console.log(`Loading content for page: ${lastPage}`);
    const contentLoaded = await loadContent(lastPage, currentLang);
    
    if (!contentLoaded) {
      console.error(`Failed to load content for page ${lastPage}, trying alternative approach`);
      // Try to reload the page as a fallback
      window.location.href = `/${currentLang}/${lastPage}.html`;
      return;
    }
    
    // Send the DMX command for that page without fade
    console.log(`Sending DMX command for key: ${targetDMXKey}`);
    try {
      await sendDMXCommand(targetDMXKey);
      updateStatus(`Programm ${targetDMXKey.toUpperCase()} aktiv.`);
    } catch (error) {
      console.error(`Error sending DMX command:`, error);
      updateStatus(`Fehler beim Aktivieren von Programm ${targetDMXKey.toUpperCase()}`);
    }
    
    // Make sure to reset the screensaver timer after returning from screensaver
    resetScreensaverTimer();
    
    console.log("Return from screensaver completed");
  } catch (error) {
    console.error(`Error returning from screensaver:`, error);
    updateStatus("Fehler beim Zurückkehren vom Bildschirmschoner");
    
    // Try to recover by forcing a page reload
    setTimeout(() => {
      window.location.href = `/${currentLang}/0000.html`;
    }, 2000);
  }
}

// Handle all click events globally to prevent navigation
document.addEventListener('click', function(event) {
  // Reset screensaver timer on any click
  resetScreensaverTimer();
  
  // Handle info button click
  if (event.target.closest('#infoButton')) {
    console.log('Info/close button clicked');
    
    // If in screensaver mode, return from screensaver
    if (currentPage === 'screensaver') {
      console.log('In screensaver mode, returning from screensaver');
      returnFromScreensaver();
    } else {
      // Otherwise, transition to screensaver
      console.log('Not in screensaver mode, transitioning to screensaver');
      transitionToScreensaver();
    }
    return;
  }
  
  // Speziell für den Screensaver-Modus
  if (currentPage === 'screensaver') {
    // Exit-Button für den Screensaver
    if (event.target.closest('.exit-screensaver')) {
      console.log('Exit button clicked, returning from screensaver');
      returnFromScreensaver();
      return;
    }
    
    // Sprachwechsel im Screensaver erlauben
    if (event.target.closest('.language-switcher')) {
      const link = event.target.closest('a');
      if (link && link.getAttribute('data-lang')) {
        event.preventDefault();
        event.stopPropagation();
        
        const clickedLang = link.getAttribute('data-lang');
        if (clickedLang && clickedLang !== currentLang) {
          console.log(`Language switched in screensaver mode to: ${clickedLang}`);
          loadContent('screensaver', clickedLang);
        }
      }
      return;
    }
    
    // Alle anderen Klicks im Screensaver ignorieren
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  
  // Standard-Handling für alle Klicks (nicht im Screensaver)
  const link = event.target.closest('a');
  if (link && link.getAttribute('href')) {
    // Always prevent default navigation
    event.preventDefault();
    event.stopPropagation();
    
    const href = link.getAttribute('href');
    
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
    if (link.id === 'all-on' || href.includes('all-on')) {
      console.log('All On button clicked, sending DMX command Y');
      sendDMXCommand('y');
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
  }
}, true);

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
  if (typeof screensaverModeManager !== 'undefined') {
    console.log('Initializing screensaver mode manager...');
    screensaverModeManager.initialize();
  } else {
    console.error('Screensaver mode manager not found!');
  }
  
  // Check if settings were updated and we need to reload them
  const settingsUpdated = sessionStorage.getItem('settingsUpdated');
  if (settingsUpdated === 'true') {
    console.log('Settings were updated, reloading them');
    sessionStorage.removeItem('settingsUpdated'); // Clear the flag
    await reloadSettings();
  }
  
  // Check if we need to reset the screensaver timer (coming from settings page)
  const resetOnLoad = sessionStorage.getItem('resetScreensaverOnLoad');
  if (resetOnLoad === 'true') {
    console.log('Resetting screensaver timer after returning from settings');
    sessionStorage.removeItem('resetScreensaverOnLoad'); // Clear the flag
    resetScreensaverTimer();
  } 
  // Otherwise, start screensaver timer if enabled and not in screensaver mode
  else if (screensaverEnabled && currentPage !== 'screensaver') {
    resetScreensaverTimer();
  }
  
  // Update settings link
  updateSettingsLink();
  
  // Initialize font size controls
  initFontSizeControls();
  
  // Load saved font size
  loadSavedFontSize();
  
  // Initialize secret settings access
  initSecretSettingsAccess();
});

/**
 * Initialize secret access to settings page through top-right corner clicks
 */
function initSecretSettingsAccess() {
  // Create an invisible area in the top-right corner for click detection
  const secretArea = document.createElement('div');
  secretArea.id = 'secretSettingsArea';
  secretArea.style.position = 'fixed';
  secretArea.style.top = '0';
  secretArea.style.right = '0';
  secretArea.style.width = '150px';
  secretArea.style.height = '150px';
  secretArea.style.zIndex = '9999';
  secretArea.style.cursor = 'default';
  document.body.appendChild(secretArea);
  
  // Set up click counter and timer
  let clickCount = 0;
  let lastClickTime = 0;
  
  secretArea.addEventListener('click', function(e) {
    const currentTime = new Date().getTime();
    
    // Reset counter if more than 3 seconds have passed
    if (currentTime - lastClickTime > 3000) {
      clickCount = 0;
    }
    
    // Increment counter and update last click time
    clickCount++;
    lastClickTime = currentTime;
    
    // If 5 clicks detected, prompt for password
    if (clickCount >= 5) {
      clickCount = 0; // Reset click count
      
      // Prompt for password
      const password = prompt('Bitte Passwort eingeben:');
      if (password === '250628') {
        // Redirect to settings page
        window.location.href = '/settings.html';
      }
    }
  });
  
  
} 