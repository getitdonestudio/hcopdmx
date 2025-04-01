/**
 * Hypercube SPA - Settings JavaScript
 * 
 * Handles settings functionality and persistence
 */

document.addEventListener('DOMContentLoaded', async function() {
  // Get form elements
  const form = document.getElementById('settingsForm');
  const screensaverTimeInput = document.getElementById('screensaverTime');
  const screensaverModeSelect = document.getElementById('screensaverMode');
  const lightPowerInput = document.getElementById('lightPower');
  const lightPowerValue = document.getElementById('lightPowerValue');
  const saveButton = document.getElementById('saveSettings');
  const resetButton = document.getElementById('resetSettings');
  const tryModeButton = document.getElementById('tryMode');
  const allOnButton = document.getElementById('allOnButton');
  const allOffButton = document.getElementById('allOffButton');
  const statusElement = document.getElementById('settingsSaveStatus');
  const backLink = document.getElementById('backLink');
  
  // Track if a mode is currently being tested
  let isTestingMode = false;
  let originalButtonText = tryModeButton ? tryModeButton.textContent : 'Try';

  // Initialize screensaver mode manager if available
  if (window.screensaverModeManager) {
    window.screensaverModeManager.initialize();
    console.log('Screensaver mode manager initialized in settings page');
  }

  // Handle All On button click
  if (allOnButton) {
    allOnButton.addEventListener('click', async function() {
      // Stop any current test
      if (isTestingMode) {
        stopTestMode();
      }
      
      showStatus('Turning all lights on...', 'success');
      
      try {
        // Send the 'q' command (all on)
        await fetch('/dmx/q', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        showStatus('All lights turned ON', 'success');
      } catch (error) {
        console.error('Error turning lights on:', error);
        showStatus('Error turning lights on', 'error');
      }
    });
  }
  
  // Handle All Off button click
  if (allOffButton) {
    allOffButton.addEventListener('click', async function() {
      // Stop any current test
      if (isTestingMode) {
        stopTestMode();
      }
      
      showStatus('Turning all lights off...', 'success');
      
      try {
        // Send the 'z' command (all off)
        await fetch('/dmx/z', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        showStatus('All lights turned OFF', 'success');
      } catch (error) {
        console.error('Error turning lights off:', error);
        showStatus('Error turning lights off', 'error');
      }
    });
  }

  // Handle back button click
  if (backLink) {
    backLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Stop any running test mode
      if (isTestingMode) {
        stopTestMode();
      }
      
      // Get the last page from session storage, or default to home
      const lastPage = sessionStorage.getItem('lastPage') || '0000';
      const lang = sessionStorage.getItem('currentLang') || 'de';
      window.location.href = `/${lang}/${lastPage}.html`;
    });
  }

  // Update the displayed value when the range input changes
  lightPowerInput.addEventListener('input', function() {
    lightPowerValue.textContent = this.value;
  });
  
  // Stop any running test when the mode selection changes
  if (screensaverModeSelect) {
    screensaverModeSelect.addEventListener('change', function() {
      if (isTestingMode) {
        stopTestMode();
      }
    });
  }

  // Function to stop the test mode
  function stopTestMode() {
    if (!isTestingMode) return;
    
    isTestingMode = false;
    
    // Restore the button text
    if (tryModeButton) {
      tryModeButton.textContent = originalButtonText;
      tryModeButton.classList.remove('active');
    }
    
    // Stop the active mode
    if (window.screensaverModeManager) {
      window.screensaverModeManager.stopActiveMode();
    } else {
      const cleanupScript = document.createElement('script');
      cleanupScript.textContent = `
        if (window.parent && window.parent.screensaverModeManager) {
          window.parent.screensaverModeManager.stopActiveMode();
        }
      `;
      document.body.appendChild(cleanupScript);
    }
    
    // Return to A program to end the preview
    fetch('/dmx/a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(() => {
      showStatus('Test stopped', 'success');
    })
    .catch(error => {
      console.error('Error stopping test:', error);
      showStatus('Error stopping test', 'error');
    });
  }

  // Try/Stop button for screensaver mode testing
  if (tryModeButton) {
    tryModeButton.addEventListener('click', async function() {
      // If already testing, stop the test
      if (isTestingMode) {
        stopTestMode();
        return;
      }
      
      const selectedMode = screensaverModeSelect.value;
      const powerValue = parseInt(lightPowerInput.value);
      
      try {
        // First, prepare the DMX by loading program A (to ensure a consistent starting point)
        await fetch('/dmx/a', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // For pulsating/cycling/disco modes, we need special handling
        if (selectedMode === 'pulsating' || selectedMode === 'cycling' || selectedMode === 'disco') {
          if (selectedMode === 'pulsating') {
            // For pulsating, we need to set Q program first as the base
            await fetch('/dmx/fade/q', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ duration: 1000 })
            });
          }
          
          // Apply the selected screensaver mode temporarily
          showStatus(`Testing "${selectedMode}" mode...`, 'success');
          
          // Save the settings as temporary for consistency
          const settings = {
            screensaver: {
              mode: selectedMode,
              lightPower: powerValue,
              transitionSpeed: 1000
            }
          };
          
          // Send the temp settings (even though we'll start the mode manually)
          await fetch('/api/settings/temp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
          });
          
          // Start the mode directly using the window.screensaverModeManager
          if (window.screensaverModeManager) {
            // We're in the main document, so we can access the manager directly
            window.screensaverModeManager.startMode(selectedMode);
          } else {
            // We're in the settings page, so we need to create a temporary mode
            const script = document.createElement('script');
            script.textContent = `
              // Start the mode for testing
              if (window.parent && window.parent.screensaverModeManager) {
                window.parent.screensaverModeManager.startMode('${selectedMode}');
              } else {
                console.error('Could not access screensaver mode manager');
              }
            `;
            document.body.appendChild(script);
          }
          
          // Update button text and state
          isTestingMode = true;
          tryModeButton.textContent = 'Stop';
          tryModeButton.classList.add('active');
          
        } else {
          // For simple modes (dimToOn, dimToOff), just show a message
          showStatus(`${selectedMode} will dim to on/off when screensaver activates`, 'success');
        }
      } catch (error) {
        console.error('Error testing mode:', error);
        showStatus('Error testing mode', 'error');
      }
    });
  }

  // Load current settings
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      throw new Error('Failed to load settings');
    }
    
    const settings = await response.json();
    
    // Apply settings to form
    screensaverTimeInput.value = settings.screensaver.timeDelay / 1000; // Convert ms to seconds
    screensaverModeSelect.value = settings.screensaver.mode;
    lightPowerInput.value = settings.screensaver.lightPower;
    lightPowerValue.textContent = settings.screensaver.lightPower;
    
    console.log('Settings loaded successfully');
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }

  // Handle form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Stop any running test mode first
    if (isTestingMode) {
      stopTestMode();
    }
    
    try {
      // Collect settings from form
      const settings = {
        screensaver: {
          timeDelay: parseInt(screensaverTimeInput.value) * 1000, // Convert seconds to ms
          mode: screensaverModeSelect.value,
          lightPower: parseInt(lightPowerInput.value),
          transitionSpeed: 1000 // Default to 1 second
        }
      };
      
      // Save settings via API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      const result = await response.json();
      console.log('Settings saved:', result);
      
      // Show success message
      showStatus('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings', 'error');
    }
  });

  // Reset button handler
  resetButton.addEventListener('click', async function() {
    // Stop any running test mode first
    if (isTestingMode) {
      stopTestMode();
    }
    
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset settings');
      }
      
      const settings = await response.json();
      
      // Apply reset settings to form
      screensaverTimeInput.value = settings.screensaver.timeDelay / 1000;
      screensaverModeSelect.value = settings.screensaver.mode;
      lightPowerInput.value = settings.screensaver.lightPower;
      lightPowerValue.textContent = settings.screensaver.lightPower;
      
      showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showStatus('Error resetting settings', 'error');
    }
  });

  // Helper function to show status messages
  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = 'settings-status ' + type;
    
    // Clear the status after 3 seconds
    setTimeout(() => {
      statusElement.className = 'settings-status';
    }, 3000);
  }

  // Initialize font size controls
  initFontSizeControls();
  
  // Load saved font size
  loadSavedFontSize();
});

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