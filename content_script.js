(() => {
  if (window.hasRun) return;
  window.hasRun = true;

  function debugLog(...args) {
    console.log('[Letterboxd Export]', ...args);
  }

  const style = document.createElement('style');
style.textContent = `
@media (max-width: 1000px) {
  .cols-2 {
    display: flex !important;
    flex-direction: column-reverse !important;
    width: 100% !important;
    gap: 20px !important;
  }
  .cols-2 .sidebar {
    width: 45% !important;
    position: relative !important;
    left: 10%;
  }

  section .col-main {
  width: vw;
  }
}



`;
document.head.appendChild(style);


  // Detect detail page (/film/slug/)
  const isMovieDetailPage = /^\/film\/[^\/]+\/?$/.test(window.location.pathname);

  function getStorageArea() {
    return (typeof browser !== 'undefined' && browser.storage?.local)
      || (typeof chrome !== 'undefined' && chrome.storage?.local);
  }

  function getSearchUrl(title, year, mode) {
    const q = encodeURIComponent(`${title} ${year}`);
    switch (mode) {
      case 'category':       return `https://1337x.to/category-search/${q}/Movies/1/`;
      case 'search':         return `https://1337x.to/search/${q}/1/`;
      case 'rottenTomatoes': return `https://www.rottentomatoes.com/search?search=${q}`;
      default:               return `https://www.google.com/search?q=${q}`;
    }
  }

  const settingsState = {
    showExportButton: true,
    searchMode: 'search',
    overlayOpacity: 70
  };

  const hoverTimeouts = new Map();
  const descriptionCache = new Map();

  async function fetchMovieDescription(url) {
    if (descriptionCache.has(url)) return descriptionCache.get(url);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');
      const selectors = [
        '.review.body-text.-prose.collapsible-text',
        '.truncate',
        '.body-text.-prose',
        '.film-summary',
        '.synopsis'
      ];
      let desc = '';
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 50) {
          desc = el.textContent.trim();
          break;
        }
      }
      if (!desc) {
        const meta = doc.querySelector('meta[name="description"]');
        desc = meta?.content || 'Description not available';
      }
      desc = desc.replace(/\s+/g, ' ').trim();
      if (desc.length > 300) desc = desc.slice(0,297) + '…';
      descriptionCache.set(url, desc);
      return desc;
    } catch (e) {
      debugLog('Desc fetch error:', e);
      return 'Description not available';
    }
  }

  function showDescriptionTooltip(container, desc, title, url, year) {
    container.querySelector('.description-tooltip')?.remove();

    const tt = document.createElement('div');
    tt.className = 'description-tooltip';
    tt.setAttribute('role','tooltip');
    tt.tabIndex = 0;
    tt.setAttribute('aria-label', `Description for ${title}`);
    Object.assign(tt.style, {
      position: 'absolute',
      left: '50%',
      bottom: '10px',
      transform: 'translateX(-50%)',
      background: '#1d1f21',
      color: '#fff',
      padding: '14px',
      fontSize: '13px',
      lineHeight: '1.5',
      zIndex: '1000',
      borderRadius: '6px',
      width: '320px',
      maxHeight: '240px',
      overflowY: 'auto',
      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      pointerEvents: 'auto',
      outline: 'none',
      opacity: '0',
      transition: 'opacity .3s ease'
    });

    // Title as link
    const a = document.createElement('a');
    Object.assign(a.style, {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#80bfff',
      textDecoration: 'underline',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = title;
    a.setAttribute('aria-label', `Go to ${title} on Letterboxd`);
    tt.appendChild(a);

    // Description text
    const d = document.createElement('div');
    d.textContent = desc;
    Object.assign(d.style, {
      fontSize: '13px',
      color: '#fff',
      whiteSpace: 'normal',
      wordWrap: 'break-word'
    });
    tt.appendChild(d);

    // Small icon “Special Search Export”
    const iconLink = document.createElement('a');
    iconLink.href = getSearchUrl(title, year, settingsState.searchMode);
    iconLink.target = '_blank';
    iconLink.rel = 'noopener noreferrer';
    iconLink.setAttribute('aria-label', 'Special search export');
    iconLink.innerHTML = '🔍';
    Object.assign(iconLink.style, {
      display: 'inline-block',
      marginTop: '12px',
      fontSize: '18px',
      textDecoration: 'none',
      color: '#80bfff'
    });
    tt.appendChild(iconLink);

    // Scrollbar styling
    if (!document.querySelector('#tooltip-scrollbar-styles')) {
      const style = document.createElement('style');
      style.id = 'tooltip-scrollbar-styles';
      style.textContent = `
        .description-tooltip::-webkit-scrollbar { width: 8px; }
        .description-tooltip::-webkit-scrollbar-track { background: #2c2f33; }
        .description-tooltip::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        .description-tooltip::-webkit-scrollbar-thumb:hover { background: #aaa; }
      `;
      document.head.appendChild(style);
    }

    container.appendChild(tt);
    setTimeout(() => { tt.style.opacity = '1'; tt.focus(); }, 10);
  }

  function hideDescriptionTooltip(container) {
    const tt = container.querySelector('.description-tooltip');
    if (tt) {
      tt.style.opacity = '0';
      setTimeout(() => tt.remove(), 300);
    }
  }

  function getMovieUrl(container) {
    const link = container.querySelector('a[href*="/film/"]') 
              || container.querySelector('a[data-film-slug]');
    const href = link?.getAttribute('href');
    if (href?.startsWith('/')) return `https://letterboxd.com${href}`;
    if (href) return href;
    const slug = container.getAttribute('data-film-slug');
    return slug ? `https://letterboxd.com/film/${slug}/` : null;
  }

  function updateAllExportLinks() {
    document.querySelectorAll('.export-link').forEach(link => {
      const t = link.dataset.movieTitle, y = link.dataset.releaseYear;
      if (t && y) {
        link.href = getSearchUrl(t, y, settingsState.searchMode);
        link.style.display = settingsState.showExportButton ? 'inline-block' : 'none';
      }
    });
  }

  async function initializeSettings() {
    const storage = getStorageArea();
    if (!storage) return;
    try {
      const stored = await storage.get(['showExportButton','searchMode','overlayOpacity']);
      Object.assign(settingsState, {
        showExportButton: stored.showExportButton !== false,
        searchMode: stored.searchMode || 'search',
        overlayOpacity: stored.overlayOpacity ?? 70
      });
      storage.onChanged.addListener((changes, area) => {
        if (area==='local') {
          let upd = false;
          ['showExportButton','searchMode','overlayOpacity'].forEach(k => {
            if (k in changes) {
              settingsState[k] = changes[k].newValue;
              upd = true;
            }
          });
          if (upd) updateAllExportLinks();
        }
      });
      updateAllExportLinks();
    } catch(e){ debugLog('Settings init error',e); }
  }

  function processPoster(container) {
    // always disable overlays on detail page
    if (isMovieDetailPage) return;

    // remove old
    container.querySelector('.poster-controls')?.remove();

    let title = container.getAttribute('data-film-name');
    let year;
    const frame = container.querySelector('.frame-title');
    if (frame) {
      const m = frame.textContent.match(/\((\d{4})\)/);
      if (m) year = m[1];
    }
    if (!year) year = container.getAttribute('data-film-slug')?.match(/\d{4}$/)?.[0];
    const posterDiv = container.querySelector('div[class*="film-poster"]');
    if (!title && posterDiv) title = posterDiv.getAttribute('data-film-name');
    if (!year && posterDiv) year = posterDiv.getAttribute('data-film-release-year');
    if (!title || !year) return;

    const url = getMovieUrl(container);
    if (!url) return;

    // overlay container
    const controls = document.createElement('div');
    controls.className = 'poster-controls';
    Object.assign(controls.style, {
      position: 'absolute', top:'0', left:'0',
      width:'100%', height:'100%',
      zIndex:'2', pointerEvents:'none'
    });

    // info strip
    const info = document.createElement('div');
    Object.assign(info.style, {
      position:'absolute', top:'5px', left:'5px',
      display:'flex', alignItems:'center', gap:'4px',
      background:`rgba(0,0,0,${settingsState.overlayOpacity/100})`,
      color:'#fff', padding:'2px 5px', pointerEvents:'auto'
    });
    // year
    const span = document.createElement('span');
    span.textContent = year;
    info.appendChild(span);

    // small export arrow
    if (settingsState.showExportButton) {
      const ex = document.createElement('a');
      ex.className = 'export-link';
      ex.textContent = '↗';
      Object.assign(ex.style, {
        color:'#fff', fontSize:'1.3rem', textDecoration:'none', cursor:'pointer'
      });
      ex.dataset.movieTitle = title;
      ex.dataset.releaseYear = year;
      ex.href = getSearchUrl(title, year, settingsState.searchMode);
      ex.target = '_blank';
      ex.rel = 'noopener noreferrer';
      info.appendChild(ex);
    }

    controls.appendChild(info);
    container.style.position = 'relative';
    container.appendChild(controls);

    // hover tooltip
    let isHover=false, ttVis=false;
    const onEnter = () => {
      isHover = true;
      if (hoverTimeouts.has(container)) clearTimeout(hoverTimeouts.get(container));
      hoverTimeouts.set(container, setTimeout(async () => {
        if (!isHover) return;
        const d = await fetchMovieDescription(url);
        if (isHover) {
          showDescriptionTooltip(container, d, title, url, year);
          ttVis = true;
        }
      }, 1000));
    };
    const onLeave = () => {
      isHover = false;
      if (!ttVis && hoverTimeouts.has(container)) {
        clearTimeout(hoverTimeouts.get(container));
        hoverTimeouts.delete(container);
      }
      setTimeout(() => {
        if (!isHover && ttVis) {
          hideDescriptionTooltip(container);
          ttVis = false;
        }
      }, 200);
    };

    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);
    container._hoverHandlers = { mouseenter:onEnter, mouseleave:onLeave };
  }

  function initPosterProcessing() {
    const sels = ['.poster-container','.react-component.poster.film-poster'];
    sels.forEach(sel => document.querySelectorAll(sel).forEach(processPoster));
    new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes.forEach(n => {
          if (n.nodeType!==1) return;
          sels.forEach(sel => {
            if (n.matches(sel)) processPoster(n);
            n.querySelectorAll(sel).forEach(processPoster);
          });
        });
      }
    }).observe(document.body, { subtree:true, childList:true });
  }

  function cleanup() {
    hoverTimeouts.forEach(clearTimeout);
    hoverTimeouts.clear();
    descriptionCache.clear();
    document.querySelectorAll('.poster-container,.react-component.poster.film-poster')
      .forEach(c => {
        if (c._hoverHandlers) {
          c.removeEventListener('mouseenter',c._hoverHandlers.mouseenter);
          c.removeEventListener('mouseleave',c._hoverHandlers.mouseleave);
          delete c._hoverHandlers;
        }
      });
  }

  window.addEventListener('beforeunload', cleanup);

  (async function init() {
    debugLog('Init Letterboxd Export');
    await initializeSettings();
    initPosterProcessing();
  })();
})();
