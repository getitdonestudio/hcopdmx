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
    
    // Reset any status
    showStatus('Test mode stopped', 'success');
  }

  // Handle Try button for screensaver mode
  if (tryModeButton) {
    tryModeButton.addEventListener('click', async function() {
      // If already testing, stop the test
      if (isTestingMode) {
        stopTestMode();
        return;
      }
      
      // Get the selected mode
      const selectedMode = screensaverModeSelect.value;
      
      try {
        isTestingMode = true;
        originalButtonText = tryModeButton.textContent;
        
        // For advanced modes, initialize and start the mode using mode manager
        if (selectedMode === 'pulsating' || selectedMode === 'cycling' || selectedMode === 'disco') {
          if (window.screensaverModeManager) {
            console.log(`Testing mode: ${selectedMode}`);
            showStatus(`Testing mode: ${selectedMode}...`, 'success');
            
            // Stop any previous mode
            window.screensaverModeManager.stopActiveMode();
            
            // Start the new mode
            window.screensaverModeManager.startMode(selectedMode);
          } else {
            // If we can't find the mode manager directly, try to access it through the parent
            const testScript = document.createElement('script');
            testScript.textContent = `
              if (window.parent && window.parent.screensaverModeManager) {
                window.parent.screensaverModeManager.stopActiveMode();
                window.parent.screensaverModeManager.startMode('${selectedMode}');
              }
            `;
            document.body.appendChild(testScript);
          }
          
          // Update button to show "Stop"
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
    
    // Set light power controls
    normalLightPowerInput.value = settings.screensaver.lightPower;
    normalLightPowerValue.textContent = settings.screensaver.lightPower;
    normalLightPowerPercentage.textContent = Math.round((settings.screensaver.lightPower / 255) * 100);
    
    // Set screensaver light power (same as normal for now)
    screensaverLightPowerInput.value = settings.screensaver.lightPower;
    screensaverLightPowerValue.textContent = settings.screensaver.lightPower;
    screensaverLightPowerPercentage.textContent = Math.round((settings.screensaver.lightPower / 255) * 100);
    
    console.log('Settings loaded successfully');
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }

  // Handle save button click
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Stop any test mode
    if (isTestingMode) {
      stopTestMode();
    }
    
    // Get form values
    const screensaverTime = parseInt(screensaverTimeInput.value) * 1000; // Convert to ms
    const screensaverMode = screensaverModeSelect.value;
    
    // Get light power values
    const lightPower = parseInt(normalLightPowerInput.value);
    const screensaverLightPower = linkLightPowersCheckbox.checked ? 
      lightPower : parseInt(screensaverLightPowerInput.value);
    
    // Build settings object
    const settings = {
      screensaver: {
        timeDelay: screensaverTime,
        mode: screensaverMode,
        lightPower: linkLightPowersCheckbox.checked ? lightPower : screensaverLightPower,
        transitionSpeed: 1000 // Fixed for now
      }
    };
    
    try {
      // Send settings to server
      showStatus('Saving settings...', 'success');
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showStatus('Settings saved successfully!', 'success');
      } else {
        showStatus(`Error: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus(`Error saving settings: ${error.message}`, 'error');
    }
  });

  // Handle reset button click
  if (resetButton) {
    resetButton.addEventListener('click', async function() {
      // Stop any test mode
      if (isTestingMode) {
        stopTestMode();
      }
      
      if (confirm('Reset all settings to defaults?')) {
        try {
          showStatus('Resetting settings...', 'success');
          
          const response = await fetch('/api/settings/reset', {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to reset settings: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (result.success) {
            // Reload the page to show default settings
            showStatus('Settings reset. Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showStatus(`Error: ${result.message}`, 'error');
          }
        } catch (error) {
          console.error('Error resetting settings:', error);
          showStatus(`Error resetting settings: ${error.message}`, 'error');
        }
      }
    });
  }

  // Show status message
  function showStatus(message, type) {
    if (!statusElement) return;
    
    // Remove any existing classes
    statusElement.className = 'settings-status';
    
    // Add new class based on type
    if (type) {
      statusElement.classList.add(type);
    }
    
    // Set message text
    statusElement.textContent = message;
    
    // Clear after 5 seconds if it's a success message
    if (type === 'success') {
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'settings-status';
      }, 5000);
    }
  }
  
  // Initialize font size controls
  initFontSizeControls();
  
  // Load saved font size
  loadSavedFontSize();
});

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
  if (decreaseFontSize) {
    decreaseFontSize.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentSize = parseInt(document.body.getAttribute('data-font-size') || '2');
      if (currentSize > 1) {
        setFontSize(currentSize - 1);
      }
    });
  }
  
  // Handle font size increase
  if (increaseFontSize) {
    increaseFontSize.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentSize = parseInt(document.body.getAttribute('data-font-size') || '2');
      if (currentSize < 5) {
        setFontSize(currentSize + 1);
      }
    });
  }
}

function setFontSize(size) {
  document.body.setAttribute('data-font-size', size);
  sessionStorage.setItem('fontSizePreference', size);
}

function loadSavedFontSize() {
  const savedSize = sessionStorage.getItem('fontSizePreference');
  if (savedSize) {
    document.body.setAttribute('data-font-size', savedSize);
  }
} 