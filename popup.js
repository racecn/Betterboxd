document.addEventListener('DOMContentLoaded', function() {
    const lightModeCheckbox = document.getElementById('lightModeCheckbox');
  
    // Load current setting
    browser.storage.local.get('lightModeSetting').then(result => {
      lightModeCheckbox.checked = result.lightModeSetting || false;
      applyTheme(result.lightModeSetting); // Apply theme based on stored setting
    }).catch(error => {
      console.error('Error loading setting:', error);
    });
  
    // Save setting when light mode checkbox changes
    lightModeCheckbox.addEventListener('change', function() {
      const isChecked = this.checked;
      browser.storage.local.set({ lightModeSetting: isChecked }).then(() => {
        console.log('Light mode setting saved:', isChecked);
        applyTheme(isChecked); // Apply theme immediately
      }).catch(error => {
        console.error('Error saving setting:', error);
      });
    });
  
    // Function to apply light or dark theme based on checkbox
    function applyTheme(isLightMode) {
      const css = `
        :root {
          --background: ${isLightMode ? '#fff' : '#14181c'};
          --text-color: ${isLightMode ? '#333' : '#fff'};
          --link-color: ${isLightMode ? '#0078D4' : '#1FBFEC'};
          --button-color: ${isLightMode ? '#0078D4' : '#1FBFEC'};
          --button-text-color: ${isLightMode ? '#fff' : '#333'};
          /* Add more variables and their values as needed */
        }
  
        body {
          background-color: var(--background-color) !important;
          color: var(--text-color) !important;
        }
  
        a {
          color: var(--link-color) !important;
        }
  
        button {
          background-color: var(--button-color) !important;
          color: var(--button-text-color) !important;
        }

        .content {
            background-color: var(--background-color) !important;
            color: var(--text-color) !important;
        }

        .site-body {
          background: var(--background-color) !important;
          color: var(--text-color) !important;}
        
        /* Add more CSS rules to override Letterboxd styles */
      `;
      
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        const tabId = tabs[0].id;
        browser.tabs.insertCSS(tabId, { code: css });
      }).catch(error => {
        console.error('Error inserting CSS:', error);
      });
    }
  });
  