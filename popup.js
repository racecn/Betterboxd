(() => {
  // HTML elements
  const showExportCheckbox = document.getElementById('show-export');
  const searchModeSelect   = document.getElementById('search-mode');
  const overlayOpacity     = document.getElementById('overlay-opacity');
  const opacityValue       = document.getElementById('opacity-value');

  // 1. Load settings from storage
  const defaults = {
    showExportButton: true,
    searchMode: 'search',  
    overlayOpacity: 70       // from 0 to 100
  };

  // Try loading from storage
  async function initializeSettings() {
    try {
      // Log the storage API being used
      console.log('Storage API:', browser.storage ? 'browser.storage' : 'chrome.storage');

      const stored = await browser.storage.local.get(Object.keys(defaults));
      
      // Log retrieved stored values
      console.log('Stored values:', stored);

      const settings = { ...defaults, ...stored };
      
      // Log final settings
      console.log('Final settings:', settings);

      // 2. Initialize UI with current settings
      showExportCheckbox.checked = settings.showExportButton;
      searchModeSelect.value     = settings.searchMode;
      overlayOpacity.value       = settings.overlayOpacity.toString();
      opacityValue.textContent   = settings.overlayOpacity.toString();

      // 3. Set up event listeners
      // When checkbox toggles
      showExportCheckbox.addEventListener('change', () => {
        settings.showExportButton = showExportCheckbox.checked;
        saveSettings(settings);
      });

      // When user changes the search mode
      searchModeSelect.addEventListener('change', () => {
        settings.searchMode = searchModeSelect.value;
        saveSettings(settings);
      });

      // When slider changes
      overlayOpacity.addEventListener('input', () => {
        settings.overlayOpacity = parseInt(overlayOpacity.value, 10);
        opacityValue.textContent = settings.overlayOpacity.toString();
        saveSettings(settings);
      });
    } catch (err) {
      console.error('Error initializing settings:', err);
    }
  }

  // 4. Save function
  function saveSettings(settings) {
    console.log('Saving settings:', settings);
    
    browser.storage.local.set(settings)
      .then(() => {
        console.log('Settings saved successfully');
      })
      .catch(err => {
        console.error('Failed to save settings', err);
      });
  }

  // Initialize settings when the popup loads
  initializeSettings();
})();