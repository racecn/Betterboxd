(() => {
  // Prevent multiple injections
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  // Debugging function
  function debugLog(...args) {
    console.log('[Letterboxd Export] ', ...args);
  }

  // Get correct storage API
  function getStorageArea() {
    return (typeof browser !== 'undefined' && browser.storage?.local) 
      || (typeof chrome !== 'undefined' && chrome.storage?.local);
  }

  // URL generation function
  function getSearchUrl(title, year, mode) {
    const query = `${title} ${year}`;
    const encodedQuery = encodeURIComponent(query);

    debugLog('Generating search URL', { title, year, mode });

    switch(mode) {
      case 'category':
        return `https://1337x.to/category-search/${encodedQuery}/Movies/1/`;
      case 'search':
        return `https://1337x.to/search/${encodedQuery}/1/`;
      default:
        return `https://www.google.com/search?q=${encodedQuery}`;
    }
  }

  // Global settings object
  const settingsState = {
    showExportButton: true,
    searchMode: 'search',
    overlayOpacity: 70
  };

  // Function to update all export links
  function updateAllExportLinks() {
    debugLog('Updating all export links', settingsState);

    // Select all export links
    const exportLinks = document.querySelectorAll('.export-link');
    
    exportLinks.forEach(link => {
      const title = link.dataset.movieTitle;
      const year = link.dataset.releaseYear;

      if (title && year) {
        // Update href
        const newHref = getSearchUrl(title, year, settingsState.searchMode);
        link.href = newHref;
        debugLog('Updated link href', { title, year, newHref });

        // Toggle visibility
        link.style.display = settingsState.showExportButton ? 'inline-block' : 'none';
      }
    });
  }

  // Initialize settings
  async function initializeSettings() {
    const storageArea = getStorageArea();
    if (!storageArea) {
      debugLog('No storage area found');
      return;
    }

    try {
      const stored = await storageArea.get([
        'showExportButton',
        'searchMode',
        'overlayOpacity'
      ]);

      // Update settings
      settingsState.showExportButton = stored.showExportButton !== false;
      settingsState.searchMode = stored.searchMode || 'search';
      settingsState.overlayOpacity = stored.overlayOpacity ?? 70;

      debugLog('Initial settings loaded', settingsState);

      // Set up storage change listener
      storageArea.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          let updated = false;

          if ('showExportButton' in changes) {
            settingsState.showExportButton = changes.showExportButton.newValue;
            updated = true;
          }
          if ('searchMode' in changes) {
            settingsState.searchMode = changes.searchMode.newValue;
            updated = true;
          }
          if ('overlayOpacity' in changes) {
            settingsState.overlayOpacity = changes.overlayOpacity.newValue;
            updated = true;
          }

          if (updated) {
            debugLog('Settings changed', settingsState);
            updateAllExportLinks();
          }
        }
      });

      // Initial update
      updateAllExportLinks();
    } catch (err) {
      debugLog('Error initializing settings', err);
    }
  }

  // Poster processing function
  function processPoster(container) {
    try {
      // Skip if within certain list types
      if (container.closest('section.list.-overlapped, section.list.-stacked')) {
        return;
      }

      // Remove existing controls
      const existingControls = container.querySelector('.poster-controls');
      if (existingControls) {
        existingControls.remove();
      }

    // Extract movie data
    let movieTitle = container.getAttribute('data-film-name');
    let releaseYear;

    // Primary method: extract year from .frame-title (e.g., "Death Race 2000 (1975)")
    const frameTitleSpan = container.querySelector('.frame-title');
    if (frameTitleSpan) {
      const match = frameTitleSpan.textContent.match(/\((\d{4})\)/);
      if (match) {
        releaseYear = match[1];
      }
    }

    // Fallback 1: extract from data-film-slug
    if (!releaseYear) {
      releaseYear = container.getAttribute('data-film-slug')?.match(/\d{4}$/)?.[0];
    }

    // Fallback 2: try poster div attributes
    if (!movieTitle || !releaseYear) {
      const posterDiv = container.querySelector('div[class*="film-poster"]');
      if (posterDiv) {
        movieTitle = movieTitle || posterDiv.getAttribute('data-film-name');
        releaseYear = releaseYear || posterDiv.getAttribute('data-film-release-year');
      }
    }

    // Validate required data
    if (!movieTitle || !releaseYear) {
      return;
    }

      // Create controls container
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'poster-controls';
      Object.assign(controlsDiv.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '2',
        pointerEvents: 'none'
      });

      // Create info container
      const infoContainer = document.createElement('div');
      Object.assign(infoContainer.style, {
        position: 'absolute',
        top: '5px',
        left: '5px',
        display: 'flex',
        flexFlow: 'row nowrap',
        alignItems: 'center',
        gap: '4px',
        background: `rgba(0, 0, 0, ${settingsState.overlayOpacity / 100})`, 
        color: '#fff',
        padding: '2px 5px',
        pointerEvents: 'auto',
      });
      controlsDiv.appendChild(infoContainer);

      // Year text
      const yearSpan = document.createElement('span');
      yearSpan.textContent = releaseYear;
      infoContainer.appendChild(yearSpan);

      // Export button
      if (settingsState.showExportButton) {
        const exportBtn = document.createElement('a');
        exportBtn.textContent = '↗';
        exportBtn.className = 'export-link';
        Object.assign(exportBtn.style, {
          background: 'transparent',
          color: '#fff', 
          border: 'none',
          padding: '0',
          cursor: 'pointer',
          fontSize: '1.3rem',
          textDecoration: 'none',
          display: 'inline-block'
        });

        // Set data attributes and href
        exportBtn.dataset.movieTitle = movieTitle;
        exportBtn.dataset.releaseYear = releaseYear;
        exportBtn.href = getSearchUrl(movieTitle, releaseYear, settingsState.searchMode);
        
        exportBtn.target = '_blank';
        exportBtn.rel = 'noopener noreferrer';

        infoContainer.appendChild(exportBtn);
      }

      // Position and append
      container.style.position = 'relative';
      container.appendChild(controlsDiv);
    } catch (err) {
      debugLog('Error processing poster', err);
    }
  }

  // Poster detection and processing
  function initPosterProcessing() {
    const posterSelectors = [
      '.poster-container',
      '.react-component.poster.film-poster'
    ];

    // Process existing posters
    posterSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(processPoster);
    });

    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              posterSelectors.forEach(selector => {
                if (node.matches?.(selector)) {
                  processPoster(node);
                }
                node.querySelectorAll?.(selector).forEach(processPoster);
              });
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize everything
  async function init() {
    debugLog('Initializing script');
    await initializeSettings();
    initPosterProcessing();
  }

  // Run initialization
  init();
})();