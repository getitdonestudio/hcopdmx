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
  
  // Disco mode controls
  const discoActivateButton = document.getElementById('discoActivateButton');
  const discoSpeedInput = document.getElementById('discoSpeed');
  const discoSpeedValue = document.getElementById('discoSpeedValue');
  const discoRandomizeCheckbox = document.getElementById('discoRandomize');
  
  const saveButton = document.getElementById('saveSettings');
  const resetButton = document.getElementById('resetSettings');
  const allOnButton = document.getElementById('allOnButton');
  const allOffButton = document.getElementById('allOffButton');
  const statusElement = document.getElementById('settingsSaveStatus');
  const backLink = document.getElementById('backLink');
  
  // Track disco mode state
  let isDiscoActive = false;
  let discoInterval = null;
  let discoSpeed = 500; // Default speed in ms
  let discoRandomize = true; // Default is random order

  // Initialize screensaver mode manager if available
  if (window.screensaverModeManager) {
    window.screensaverModeManager.initialize();
    console.log('Screensaver mode manager initialized in settings page');
  }

  // Update screensaver time value display when slider changes
  if (screensaverTimeInput) {
    const screensaverTimeValue = document.getElementById('screensaverTimeValue');
    
    if (screensaverTimeValue) {
      screensaverTimeInput.addEventListener('input', function() {
        screensaverTimeValue.textContent = this.value;
      });
    }
  }

  // Handle disco activate button
  if (discoActivateButton) {
    discoActivateButton.addEventListener('click', function() {
      if (isDiscoActive) {
        stopDiscoMode();
      } else {
        startDiscoMode();
      }
    });
  }
  
  // Update disco speed value when slider changes
  if (discoSpeedInput) {
    discoSpeedInput.addEventListener('input', function() {
      const value = parseInt(this.value);
      discoSpeedValue.textContent = value;
      discoSpeed = value;
      
      // If disco mode is active, restart it with new speed
      if (isDiscoActive) {
        stopDiscoMode();
        startDiscoMode();
      }
    });
    
    // Save disco speed when slider changes end
    discoSpeedInput.addEventListener('change', async function() {
      const value = parseInt(this.value);
      
      try {
        // Get current settings
        const response = await fetch('/api/settings');
        if (!response.ok) {
          console.error('Failed to load settings for update');
          return;
        }
        
        const currentSettings = await response.json();
        
        // Update settings with new disco speed
        const updatedSettings = {
          ...currentSettings,
          disco: {
            ...currentSettings.disco || {},
            speed: value
          }
        };
        
        // Save the updated settings
        const saveResponse = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedSettings)
        });
        
        if (saveResponse.ok) {
          console.log('Disco speed saved:', value);
          showStatus('Disco speed saved', 'success');
        }
      } catch (error) {
        console.error('Error saving disco speed:', error);
      }
    });
  }
  
  // Handle disco randomize checkbox
  if (discoRandomizeCheckbox) {
    discoRandomizeCheckbox.addEventListener('change', async function() {
      const isRandom = this.checked;
      discoRandomize = isRandom;
      
      try {
        // Get current settings
        const response = await fetch('/api/settings');
        if (!response.ok) {
          console.error('Failed to load settings for update');
          return;
        }
        
        const currentSettings = await response.json();
        
        // Update settings with new disco randomize value
        const updatedSettings = {
          ...currentSettings,
          disco: {
            ...currentSettings.disco || {},
            randomize: isRandom
          }
        };
        
        // Save the updated settings
        const saveResponse = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedSettings)
        });
        
        if (saveResponse.ok) {
          console.log('Disco randomize saved:', isRandom);
          showStatus('Disco randomize setting saved', 'success');
          
          // If disco mode is active, restart it with new setting
          if (isDiscoActive) {
            stopDiscoMode();
            startDiscoMode();
          }
        }
      } catch (error) {
        console.error('Error saving disco randomize setting:', error);
      }
    });
  }
  
  /**
   * Start the disco mode
   */
  function startDiscoMode() {
    if (isDiscoActive) return;
    
    isDiscoActive = true;
    discoActivateButton.textContent = 'Stop';
    discoActivateButton.classList.add('active');
    
    showStatus('Disco mode activated', 'success');
    
    let currentIndex = 0;
    // Default random order array
    const randomPrograms = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
    // Specific sequence order
    const sequentialPrograms = ['a', 'b', 'c', 'e', 'i', 'd', 'g', 'f', 'j', 'k', 'm', 'h', 'l', 'n', 'o', 'p'];
    
    // Function to change to next program
    async function changeProgram() {
      try {
        let program;
        
        if (discoRandomize) {
          // Random mode - pick a random program
          const randomIndex = Math.floor(Math.random() * randomPrograms.length);
          program = randomPrograms[randomIndex];
        } else {
          // Sequential mode - go through the specific order
          program = sequentialPrograms[currentIndex];
          currentIndex = (currentIndex + 1) % sequentialPrograms.length;
        }
        
        await fetch(`/dmx/${program}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Error changing program in disco mode:', error);
      }
    }
    
    // Start with first program
    changeProgram();
    
    // Set interval to change programs
    discoInterval = setInterval(changeProgram, discoSpeed);
  }
  
  /**
   * Stop the disco mode
   */
  function stopDiscoMode() {
    if (!isDiscoActive) return;
    
    isDiscoActive = false;
    discoActivateButton.textContent = 'Activate';
    discoActivateButton.classList.remove('active');
    
    // Clear the interval
    if (discoInterval) {
      clearInterval(discoInterval);
      discoInterval = null;
    }
    
    showStatus('Disco mode deactivated', 'success');
  }

  // Handle All On button click
  if (allOnButton) {
    allOnButton.addEventListener('click', async function() {
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

  // Handle back button click - make sure to stop disco mode if active
  if (backLink) {
    backLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Stop disco mode if active
      if (isDiscoActive) {
        stopDiscoMode();
      }
      
      // Get the last page from session storage, or default to home
      const lastPage = sessionStorage.getItem('lastPage') || '0000';
      const lang = sessionStorage.getItem('currentLang') || 'de';
      
      // Add a script to reset the screensaver timer when the page loads
      const resetScript = document.createElement('script');
      resetScript.textContent = `
        sessionStorage.setItem('resetScreensaverOnLoad', 'true');
      `;
      document.body.appendChild(resetScript);
      
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

    // Apply the changes immediately to DMX
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
  
  // Add event listener for the linkLightPowers checkbox
  linkLightPowersCheckbox.addEventListener('change', async function() {
    // Show/hide screensaver light power container based on checkbox state
    screensaverLightPowerContainer.style.display = this.checked ? 'none' : 'block';
    
    // If checking the box, sync the screensaver power with the normal power
    if (this.checked) {
      const normalValue = parseInt(normalLightPowerInput.value);
      screensaverLightPowerInput.value = normalValue;
      screensaverLightPowerValue.textContent = normalValue;
      screensaverLightPowerPercentage.textContent = Math.round((normalValue / 255) * 100);
    }
    
    // Save the setting
    try {
      // Get current settings
      const response = await fetch('/api/settings');
      if (!response.ok) {
        console.error('Failed to load settings for update');
        return;
      }
      
      const currentSettings = await response.json();
      
      // Update the settings
      const updatedSettings = {
        ...currentSettings,
        linkLightPowers: this.checked
      };
      
      // If linking is enabled, sync screensaver power with normal power
      if (this.checked) {
        updatedSettings.screensaver = {
          ...updatedSettings.screensaver,
          lightPower: parseInt(normalLightPowerInput.value)
        };
      }
      
      // Save the updated settings
      const saveResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });
      
      if (saveResponse.ok) {
        console.log('Link light powers setting saved:', this.checked);
        showStatus('Link setting saved', 'success');
        
        // Set the settings updated flag
        sessionStorage.setItem('settingsUpdated', 'true');
      }
    } catch (error) {
      console.error('Error saving link light powers setting:', error);
    }
  });
  
  // Add a debounced version of the same event to save settings after sliding stops
  let lightPowerSaveTimeout = null;
  normalLightPowerInput.addEventListener('change', async function() {
    const value = parseInt(this.value);
    
    // Clear any previous timeout
    if (lightPowerSaveTimeout) {
      clearTimeout(lightPowerSaveTimeout);
    }
    
    // Set a timeout to save the settings
    lightPowerSaveTimeout = setTimeout(async () => {
      try {
        // Get current settings
        const response = await fetch('/api/settings');
        if (!response.ok) {
          console.error('Failed to load settings for update');
          return;
        }
        
        const currentSettings = await response.json();
        
        // Update the settings
        const updatedSettings = {
          ...currentSettings,
          lightPower: value,
          screensaver: {
            ...currentSettings.screensaver,
            lightPower: linkLightPowersCheckbox.checked ? value : currentSettings.screensaver.lightPower
          }
        };
        
        // Save the updated settings
        const saveResponse = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedSettings)
        });
        
        if (saveResponse.ok) {
          console.log('Light power settings saved:', value);
          showStatus('Light power settings saved', 'success');
          
          // Set the settings updated flag
          sessionStorage.setItem('settingsUpdated', 'true');
        }
      } catch (error) {
        console.error('Error saving light power settings:', error);
      }
    }, 500); // 500ms debounce
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
  
  // Add a debounced version to save screensaver light power settings
  let screensaverLightPowerSaveTimeout = null;
  screensaverLightPowerInput.addEventListener('change', async function() {
    const value = parseInt(this.value);
    
    // Clear any previous timeout
    if (screensaverLightPowerSaveTimeout) {
      clearTimeout(screensaverLightPowerSaveTimeout);
    }
    
    // Set a timeout to save the settings
    screensaverLightPowerSaveTimeout = setTimeout(async () => {
      try {
        // Get current settings
        const response = await fetch('/api/settings');
        if (!response.ok) {
          console.error('Failed to load settings for update');
          return;
        }
        
        const currentSettings = await response.json();
        
        // Update the screensaver settings
        const updatedSettings = {
          ...currentSettings,
          screensaver: {
            ...currentSettings.screensaver,
            lightPower: value
          }
        };
        
        // Save the updated settings
        const saveResponse = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedSettings)
        });
        
        if (saveResponse.ok) {
          console.log('Screensaver light power settings saved:', value);
          showStatus('Screensaver light power settings saved', 'success');
          
          // Set the settings updated flag
          sessionStorage.setItem('settingsUpdated', 'true');
        }
      } catch (error) {
        console.error('Error saving screensaver light power settings:', error);
      }
    }, 500); // 500ms debounce
  });
  
  // Stop any running test when the mode selection changes
  if (screensaverModeSelect) {
    screensaverModeSelect.addEventListener('change', function() {
      // Nothing needed here now, just keep the event listener
    });
  }

  /**
   * Send a direct DMX command with fade
   */
  async function sendDirectDMXCommand(channels, fadeTime = 1000) {
    try {
      return fetch('/dmx/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channels: channels,
          fadeTime: fadeTime
        })
      });
    } catch (error) {
      console.error('Error sending DMX command:', error);
      throw error;
    }
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
    
    // Update the displayed screensaver time value
    const screensaverTimeValue = document.getElementById('screensaverTimeValue');
    if (screensaverTimeValue) {
      screensaverTimeValue.textContent = Math.round(settings.screensaver.timeDelay / 1000);
    }
    
    // Set the checkbox state for linking light powers
    if (linkLightPowersCheckbox) {
      linkLightPowersCheckbox.checked = settings.linkLightPowers;
      // Show/hide screensaver light power control based on link status
      screensaverLightPowerContainer.style.display = settings.linkLightPowers ? 'none' : 'block';
    }
    
    // Set normal light power controls
    normalLightPowerInput.value = settings.lightPower;
    normalLightPowerValue.textContent = settings.lightPower;
    normalLightPowerPercentage.textContent = Math.round((settings.lightPower / 255) * 100);
    
    // Set screensaver light power
    screensaverLightPowerInput.value = settings.screensaver.lightPower;
    screensaverLightPowerValue.textContent = settings.screensaver.lightPower;
    screensaverLightPowerPercentage.textContent = Math.round((settings.screensaver.lightPower / 255) * 100);
    
    // Set disco speed if available
    if (settings.disco && settings.disco.speed && discoSpeedInput) {
      discoSpeedInput.value = settings.disco.speed;
      discoSpeedValue.textContent = settings.disco.speed;
      discoSpeed = settings.disco.speed;
    }
    
    // Set disco randomize setting if available
    if (settings.disco && discoRandomizeCheckbox && settings.disco.randomize !== undefined) {
      discoRandomizeCheckbox.checked = settings.disco.randomize;
      discoRandomize = settings.disco.randomize;
    }
    
    console.log('Settings loaded successfully');
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }

  // Handle submit - make sure to update with disco mode settings
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Stop disco mode if active
    if (isDiscoActive) {
      stopDiscoMode();
    }
    
    // Get form values
    const screensaverTime = parseInt(screensaverTimeInput.value) * 1000; // Convert to ms
    const screensaverMode = screensaverModeSelect.value;
    
    // Get light power values
    const lightPower = parseInt(normalLightPowerInput.value);
    const screensaverLightPower = linkLightPowersCheckbox.checked ? 
      lightPower : parseInt(screensaverLightPowerInput.value);
    
    // Get disco settings
    const discoSettingsSpeed = parseInt(discoSpeedInput.value);
    const discoSettingsRandomize = discoRandomizeCheckbox ? discoRandomizeCheckbox.checked : true;
    
    // Flag to indicate screensaver settings have changed
    const screensaverSettingsChanged = true;
    
    // Build settings object
    const settings = {
      lightPower: lightPower,
      linkLightPowers: linkLightPowersCheckbox.checked,
      screensaver: {
        timeDelay: screensaverTime,
        mode: screensaverMode,
        lightPower: linkLightPowersCheckbox.checked ? lightPower : screensaverLightPower,
        transitionSpeed: 1000 // Fixed for now
      },
      disco: {
        speed: discoSettingsSpeed,
        randomize: discoSettingsRandomize
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
        
        // Set a flag in sessionStorage to indicate settings have been updated
        sessionStorage.setItem('settingsUpdated', 'true');
        
        // If screensaver settings changed, add a script to reset the screensaver timer 
        // in the parent window (in case we're in an iframe)
        if (screensaverSettingsChanged) {
          const resetScript = document.createElement('script');
          resetScript.textContent = `
            if (window.parent && window.parent.resetScreensaverTimer) {
              window.parent.resetScreensaverTimer();
            } else if (window.resetScreensaverTimer) {
              window.resetScreensaverTimer();
            }
          `;
          document.body.appendChild(resetScript);
          console.log('Screensaver settings changed, timer reset triggered');
        }
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
            // Set a flag in sessionStorage to indicate settings have been updated
            sessionStorage.setItem('settingsUpdated', 'true');
            
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