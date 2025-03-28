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
  const statusElement = document.getElementById('settingsSaveStatus');
  const backLink = document.getElementById('backLink');

  // Handle back button click
  if (backLink) {
    backLink.addEventListener('click', function(e) {
      e.preventDefault();
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
}); 