// ==UserScript==
// @name         Letterboxd Poster Helper (Lazy-Load Aware, Export Icon)
// @namespace    your.namespace.here
// @version      1.0
// @description  Adds a year overlay with an export icon to open 1337x search
// @match        *://letterboxd.com/*
// @grant        none
// ==/UserScript==

(() => {
  // Prevent multiple injections
  if (window.hasRun) return;
  window.hasRun = true;

  // ----------------------------------
  // Configuration
  // ----------------------------------
  const POSTER_SELECTOR = '.poster-container';
  // Use the narrowest reliable container that wraps .poster-container elements if possible
  const CONTAINER_SELECTOR = 'body';
  
  // Debounce intervals
  const DEBOUNCE_DELAY = 200;       // ms to wait before processing new/updated posters
  const URL_CHECK_INTERVAL = 1000;  // ms for checking URL changes (SPAs)

  let lastUrl = location.href;
  let observer = null;
  let mutationTimeout = null;

  // Queue for newly added/updated posters
  const newPosterQueue = new Set();

  // ----------------------------------
  // Processing each poster container
  // ----------------------------------
  function processPosterContainer(container) {
    try {
      // Skip if already processed
      if (container.querySelector('.poster-controls')) return;

      // Find the actual poster div
      const posterDiv = container.querySelector('div[class*="film-poster"]');
      if (!posterDiv) return;

      // Extract film data
      const movieTitle  = posterDiv.getAttribute('data-film-name');
      let   releaseYear = posterDiv.getAttribute('data-film-release-year');
      const filmSlug    = posterDiv.getAttribute('data-film-slug');

      // If releaseYear missing, try frame-title
      if (!releaseYear) {
        const frameTitleSpan = posterDiv.querySelector('.frame-title');
        if (frameTitleSpan) {
          const match = frameTitleSpan.textContent.match(/\((\d{4})\)/);
          if (match) {
            releaseYear = match[1];
          }
        }
      }

      // If still missing data, skip
      if (!movieTitle || !releaseYear) {
        console.debug(`Poster missing data. Title=${movieTitle}, Year=${releaseYear}`);
        return;
      }

      console.debug(`Processing poster: ${movieTitle} (${releaseYear})`);

      // Create overlay container
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'poster-controls';
      Object.assign(controlsDiv.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '2',
        pointerEvents: 'none', // let normal interactions through by default
      });

      // Create a small container for the year + export icon
      const infoContainer = document.createElement('div');
      Object.assign(infoContainer.style, {
        position: 'absolute',
        top: '5px',
        left: '5px',
        display: 'flex',
        flexFlow: 'row nowrap',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '2px 5px',
        pointerEvents: 'auto', // re-enable pointer events in this area
      });
      controlsDiv.appendChild(infoContainer);

      // Year as plain text
      const yearSpan = document.createElement('span');
      yearSpan.textContent = releaseYear;
      infoContainer.appendChild(yearSpan);

      // Export icon button (opens 1337x link in new tab)
      const exportIcon = document.createElement('button');
      exportIcon.textContent = '↗'; // You can change this to an SVG or Unicode symbol you prefer
      Object.assign(exportIcon.style, {
        background: 'transparent',
        color: '#fff',
        border: 'none',
        padding: '0',
        cursor: 'pointer',
        fontSize: '1rem',
      });

      // Build the 1337x URL
      const torrentSearchUrl = `https://1337x.to/search/${encodeURIComponent(`${movieTitle} ${releaseYear}`)}/1/`;
      exportIcon.onclick = (e) => {
        e.stopPropagation();  // so we don’t trigger any underlying UI
        window.open(torrentSearchUrl, '_blank', 'noopener');
      };
      infoContainer.appendChild(exportIcon);

      // Ensure container is positioned relative
      container.style.position = 'relative';
      container.appendChild(controlsDiv);
    } catch (err) {
      console.error('Error processing poster container:', err);
    }
  }

  // ----------------------------------
  // Mutation Observer callback
  // ----------------------------------
  function handleMutations(mutations) {
    let foundSomething = false;

    for (const mutation of mutations) {
      // 1) Newly added nodes
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches?.(POSTER_SELECTOR)) {
              newPosterQueue.add(node);
              foundSomething = true;
            }
            const nested = node.querySelectorAll?.(POSTER_SELECTOR);
            nested?.forEach((elem) => {
              newPosterQueue.add(elem);
              foundSomething = true;
            });
          }
        }
      }

      // 2) Attribute changes (e.g., lazy load class changes) on .poster-container
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.nodeType === Node.ELEMENT_NODE && target.matches?.(POSTER_SELECTOR)) {
          newPosterQueue.add(target);
          foundSomething = true;
        }
      }
    }

    if (foundSomething) {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        newPosterQueue.forEach(processPosterContainer);
        newPosterQueue.clear();
      }, DEBOUNCE_DELAY);
    }
  }

  // ----------------------------------
  // Initialize MutationObserver
  // ----------------------------------
  function initObserver() {
    observer?.disconnect();

    const container = document.querySelector(CONTAINER_SELECTOR) || document.body;
    observer = new MutationObserver(handleMutations);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // Process existing posters
    container.querySelectorAll(POSTER_SELECTOR).forEach(processPosterContainer);
  }

  // ----------------------------------
  // Detect URL changes (SPAs)
  // ----------------------------------
  function watchUrlChanges() {
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.debug('URL changed, re-initializing observer...');
        initObserver();
      }
    }, URL_CHECK_INTERVAL);
  }

  // ----------------------------------
  // Start everything
  // ----------------------------------
  function init() {
    console.debug('Lazy-Load Aware Content Script (Export Icon) initializing...');
    initObserver();
    watchUrlChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
