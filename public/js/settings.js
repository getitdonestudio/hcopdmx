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
  
  // New light power controls
  const normalLightPowerInput = document.getElementById('normalLightPower');
  const normalLightPowerValue = document.getElementById('normalLightPowerValue');
  const normalLightPowerPercentage = document.getElementById('normalLightPowerPercentage');
  const linkLightPowersCheckbox = document.getElementById('linkLightPowers');
  const screensaverLightPowerContainer = document.getElementById('screensaverLightPowerContainer');
  const screensaverLightPowerInput = document.getElementById('screensaverLightPower');
  const screensaverLightPowerValue = document.getElementById('screensaverLightPowerValue');
  const screensaverLightPowerPercentage = document.getElementById('screensaverLightPowerPercentage');
  const applyLightPowerButton = document.getElementById('applyLightPower');
  
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
        // Send the 'y' command (all on - sets channels to values in CSV) 
        await fetch('/dmx/y', {
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

  // Update the displayed values when the normal light power range input changes
  normalLightPowerInput.addEventListener('input', async function() {
    const value = parseInt(this.value);
    normalLightPowerValue.textContent = value;
    normalLightPowerPercentage.textContent = Math.round((value / 255) * 100);
    
    // If link is checked, update the screensaver value too
    if (linkLightPowersCheckbox.checked) {
      screensaverLightPowerInput.value = value;
      screensaverLightPowerValue.textContent = value;
      screensaverLightPowerPercentage.textContent = Math.round((value / 255) * 100);
    }

    // Apply the changes immediately
    try {
      await fetch('/dmx/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channels: Array(512).fill(value)
        })
      });
    } catch (error) {
      console.error('Error applying light power:', error);
    }
  });
  
  // Update the displayed values when the screensaver light power range input changes
  screensaverLightPowerInput.addEventListener('input', async function() {
    const value = parseInt(this.value);
    screensaverLightPowerValue.textContent = value;
    screensaverLightPowerPercentage.textContent = Math.round((value / 255) * 100);

    // Apply the changes immediately if in screensaver mode
    if (document.body.classList.contains('screensaver')) {
      try {
        await fetch('/dmx/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channels: Array(512).fill(value)
          })
        });
      } catch (error) {
        console.error('Error applying screensaver light power:', error);
      }
    }
  });
  
  // Handle linking/unlinking light power controls
  linkLightPowersCheckbox.addEventListener('change', function() {
    if (this.checked) {
      // When linked, hide the screensaver control and set its value to match normal
      screensaverLightPowerContainer.style.display = 'none';
      screensaverLightPowerInput.value = normalLightPowerInput.value;
      screensaverLightPowerValue.textContent = normalLightPowerValue.textContent;
      screensaverLightPowerPercentage.textContent = normalLightPowerPercentage.textContent;
    } else {
      // When unlinked, show the screensaver control
      screensaverLightPowerContainer.style.display = 'block';
    }
  });
  
  // Stop any running test when the mode selection changes
  if (screensaverModeSelect) {
    screensaverModeSelect.addEventListener('change', function() {
      if (isTestingMode) {
        stopTestMode();
      }
    });
  }

  // Handle Apply Light Power button click
  applyLightPowerButton.addEventListener('click', async function() {
    const normalValue = parseInt(normalLightPowerInput.value);
    const screensaverValue = parseInt(screensaverLightPowerInput.value);
    
    try {
      // Apply normal light power using direct command
      await fetch('/dmx/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channels: Array(512).fill(normalValue)
        })
      });

      // If we're in screensaver mode, also apply screensaver power
      if (document.body.classList.contains('screensaver')) {
        await fetch('/dmx/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channels: Array(512).fill(screensaverValue)
          })
        });
      }

      showStatus('Light power applied successfully', 'success');
    } catch (error) {
      console.error('Error applying light power:', error);
      showStatus('Error applying light power', 'error');
    }
  });

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
      const powerValue = parseInt(screensaverLightPowerInput.value);
      
      try {
        // First, prepare the DMX by loading program A (to ensure a consistent starting point)
        await fetch('/dmx/a', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // For all modes, we need special handling
        if (selectedMode === 'pulsating' || selectedMode === 'cycling' || selectedMode === 'disco' || 
            selectedMode === 'dimToOn' || selectedMode === 'dimToOff') {
          
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
      throw new Error('Failed to fetch settings');
    }
    
    const settings = await response.json();
    
    // Load screensaver settings
    if (settings.screensaver) {
      // Convert from ms to seconds for the UI
      if (screensaverTimeInput) {
        screensaverTimeInput.value = settings.screensaver.timeDelay / 1000;
      }
      
      if (screensaverModeSelect) {
        screensaverModeSelect.value = settings.screensaver.mode || 'dimToOn';
      }
      
      if (screensaverLightPowerInput) {
        const value = settings.screensaver.lightPower || 255;
        screensaverLightPowerInput.value = value;
        screensaverLightPowerValue.textContent = value;
        screensaverLightPowerPercentage.textContent = Math.round((value / 255) * 100);
      }
    }
    
    // Load normal light power setting
    if (normalLightPowerInput) {
      const value = settings.lightPower || 255;
      normalLightPowerInput.value = value;
      normalLightPowerValue.textContent = value;
      normalLightPowerPercentage.textContent = Math.round((value / 255) * 100);
    }
    
    // Load link setting
    if (linkLightPowersCheckbox) {
      const linked = settings.linkLightPowers !== undefined ? settings.linkLightPowers : true;
      linkLightPowersCheckbox.checked = linked;
      
      // Update display of screensaver control based on link state
      screensaverLightPowerContainer.style.display = linked ? 'none' : 'block';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings. Using defaults.', 'error');
  }

  // Handle form submission (save settings)
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Stop any running test mode
      if (isTestingMode) {
        stopTestMode();
      }
      
      // Gather settings from form
      const settings = {
        screensaver: {
          timeDelay: parseInt(screensaverTimeInput.value) * 1000, // Convert to ms
          mode: screensaverModeSelect.value,
          transitionSpeed: 1000 // Default transition speed
        },
        lightPower: parseInt(normalLightPowerInput.value),
        linkLightPowers: linkLightPowersCheckbox.checked
      };
      
      // Add screensaver light power if not linked
      if (!linkLightPowersCheckbox.checked) {
        settings.screensaver.lightPower = parseInt(screensaverLightPowerInput.value);
      } else {
        // If linked, use the same value for both
        settings.screensaver.lightPower = parseInt(normalLightPowerInput.value);
      }
      
      // Save to server
      try {
        showStatus('Saving settings...', 'success');
        
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
        
        showStatus('Settings saved successfully!', 'success');
      } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Error saving settings', 'error');
      }
    });
  }

  // Handle reset button
  if (resetButton) {
    resetButton.addEventListener('click', async function() {
      // Stop any running test mode
      if (isTestingMode) {
        stopTestMode();
      }
      
      try {
        showStatus('Resetting to defaults...', 'success');
        
        const response = await fetch('/api/settings/reset', {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('Failed to reset settings');
        }
        
        const settings = await response.json();
        
        // Load screensaver settings
        if (settings.screensaver) {
          // Convert from ms to seconds for the UI
          if (screensaverTimeInput) {
            screensaverTimeInput.value = settings.screensaver.timeDelay / 1000;
          }
          
          if (screensaverModeSelect) {
            screensaverModeSelect.value = settings.screensaver.mode || 'dimToOn';
          }
          
          if (screensaverLightPowerInput) {
            const value = settings.screensaver.lightPower || 255;
            screensaverLightPowerInput.value = value;
            screensaverLightPowerValue.textContent = value;
            screensaverLightPowerPercentage.textContent = Math.round((value / 255) * 100);
          }
        }
        
        // Load normal light power setting
        if (normalLightPowerInput) {
          const value = settings.lightPower || 255;
          normalLightPowerInput.value = value;
          normalLightPowerValue.textContent = value;
          normalLightPowerPercentage.textContent = Math.round((value / 255) * 100);
        }
        
        // Reset link setting
        if (linkLightPowersCheckbox) {
          const linked = settings.linkLightPowers !== undefined ? settings.linkLightPowers : true;
          linkLightPowersCheckbox.checked = linked;
          
          // Update display of screensaver control based on link state
          screensaverLightPowerContainer.style.display = linked ? 'none' : 'block';
        }
        
        showStatus('Settings reset to defaults', 'success');
      } catch (error) {
        console.error('Error resetting settings:', error);
        showStatus('Error resetting settings', 'error');
      }
    });
  }

  // Initialize font size controls
  initFontSizeControls();
  
  // Function to show status message
  function showStatus(message, type) {
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = 'settings-status';
    statusElement.classList.add(type);
    
    // Make the status visible
    statusElement.style.opacity = '1';
    
    // Automatically hide after 3 seconds unless it's an error
    if (type !== 'error') {
      setTimeout(() => {
        statusElement.style.opacity = '0';
      }, 3000);
    }
  }
});

// Font size controls
function initFontSizeControls() {
  const increaseFontBtn = document.getElementById('increaseFontSize');
  const decreaseFontBtn = document.getElementById('decreaseFontSize');
  const fontSizeToggle = document.getElementById('fontSizeToggle');
  const fontSizeOptions = document.querySelector('.font-size-options');
  
  // Load saved font size
  loadSavedFontSize();
  
  // Toggle font size options display
  if (fontSizeToggle && fontSizeOptions) {
    fontSizeToggle.addEventListener('click', function() {
      fontSizeOptions.classList.toggle('visible');
    });
  }
  
  // Increase font size
  if (increaseFontBtn) {
    increaseFontBtn.addEventListener('click', function() {
      const currentSize = parseInt(document.body.getAttribute('data-font-size')) || 2;
      if (currentSize < 4) {
        setFontSize(currentSize + 1);
      }
    });
  }
  
  // Decrease font size
  if (decreaseFontBtn) {
    decreaseFontBtn.addEventListener('click', function() {
      const currentSize = parseInt(document.body.getAttribute('data-font-size')) || 2;
      if (currentSize > 1) {
        setFontSize(currentSize - 1);
      }
    });
  }
}

function setFontSize(size) {
  document.body.setAttribute('data-font-size', size);
  localStorage.setItem('fontSize', size);
}

function loadSavedFontSize() {
  const savedSize = localStorage.getItem('fontSize');
  if (savedSize) {
    document.body.setAttribute('data-font-size', savedSize);
  }
} 