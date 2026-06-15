(function () {
  let settings = {};
  let styleElement = null;
  const blockedElementsSet = new WeakSet();

  function isContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.getManifest());
    } catch (e) {
      return false;
    }
  }

  // Retrieve settings directly from storage to eliminate asynchronous background messaging delay
  chrome.storage.local.get({
    masterSwitch: true,
    ytShortsBlockMode: 'camouflage',
    ytSidebarStrip: true,
    ytGridShelfNuke: true,
    ytSearchFilter: true,
    ytChannelTabRemove: true,
    ytRecommendationHide: true,
    lockKeyboardScroll: true,
    lockMouseWheelScroll: true
  }, (items) => {
    settings = items;
    applyDynamicCSS();
    initBlocker();
  });

  // Watch for settings changes dynamically
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      let changed = false;
      for (const key in changes) {
        if (changes[key] && settings[key] !== changes[key].newValue) {
          settings[key] = changes[key].newValue;
          changed = true;
        }
      }
      if (changed) {
        applyDynamicCSS();
        // If settings toggled, run a full scrub immediately
        scrubDOM();
      }
    }
  });

  // Inject initial CSS to hide target selectors immediately, avoiding DOM layout flashes
  function applyDynamicCSS() {
    if (!settings.masterSwitch) {
      if (styleElement) {
        styleElement.remove();
        styleElement = null;
      }
      return;
    }

    let css = '';

    // Hide sidebar entry for Shorts
    if (settings.ytSidebarStrip) {
      css += `
        ytd-guide-entry-renderer:has(a[href*="/shorts"]),
        ytd-mini-guide-entry-renderer:has(a[href*="/shorts"]),
        a[href*="/shorts"] {
          display: none !important;
        }
      `;
    }

    // Hide Shorts shelf on Home Feed
    if (settings.ytGridShelfNuke) {
      css += `
        ytd-rich-shelf-renderer[is-shorts],
        ytd-rich-shelf-renderer:has(span#title),
        ytd-reel-shelf-renderer {
          display: none !important;
        }
      `;
    }

    // Hide channel page Shorts tab
    if (settings.ytChannelTabRemove) {
      css += `
        tp-yt-paper-tab:has(a[href*="/shorts"]),
        tp-yt-paper-tab:has(.tab-title) {
          /* Handled in JS to double check text Content, but CSS hiding helps */
        }
      `;
    }

    // Hide recommendation items
    if (settings.ytRecommendationHide) {
      css += `
        ytd-compact-video-renderer:has(a[href*="/shorts"]),
        ytd-reel-video-renderer {
          display: none !important;
        }
      `;
    }

    // Hide end screen elements linking to shorts
    css += `
      .ytp-ce-element[class*="shorts"],
      .ytp-ce-video[href*="/shorts/"] {
        display: none !important;
      }
    `;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'doomscroll-blocker-yt-styles';
      document.documentElement.appendChild(styleElement);
    }
    styleElement.textContent = css;
  }

  function reportBlock(count = 1) {
    try {
      // Pre-check context validity using local manifest test
      if (!isContextValid()) {
        return;
      }
      chrome.runtime.sendMessage({ action: 'incrementBlocked', count: count });
    } catch (e) {
      // Suppress standard 'context invalidated' warnings when extension is reloaded
      const errStr = (e && (e.message || e.toString())) || '';
      if (errStr.toLowerCase().includes('invalidated') || errStr.toLowerCase().includes('context')) {
        return;
      }
      console.warn('Block count report failed:', e);
    }
  }

  // Helper to query all video elements, searching recursively inside all DOM elements and Shadow DOM encapsulation roots
  function getAllVideos() {
    const videos = [];
    const visited = new Set();

    function traverse(element) {
      if (!element || visited.has(element)) return;
      visited.add(element);

      if (element.tagName === 'VIDEO') {
        videos.push(element);
      }

      // Check shadow DOM
      if (element.shadowRoot) {
        traverse(element.shadowRoot);
      }

      // Check standard children
      if (element.children) {
        for (let i = 0; i < element.children.length; i++) {
          traverse(element.children[i]);
        }
      }

      // Check document fragment children (like ShadowRoot)
      if (element.childNodes) {
        for (let i = 0; i < element.childNodes.length; i++) {
          const node = element.childNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            traverse(node);
          }
        }
      }
    }

    traverse(document.documentElement);
    return videos;
  }

  // Mute, pause, and nuke any playing video on a Shorts page
  function nukeAllVideos() {
    if (!isContextValid()) return;
    if (!window.location.pathname.startsWith('/shorts/')) return;
    if (!settings.masterSwitch) return;
    if (settings.ytShortsBlockMode !== 'camouflage' && settings.ytShortsBlockMode !== 'blackout') return;

    getAllVideos().forEach(video => {
      try {
        video.muted = true;
        video.volume = 0;
        if (!video.paused) {
          video.pause();
        }
        if (video.src && video.src !== '') {
          video.src = '';
          video.removeAttribute('src');
          video.load();
        }
      } catch (err) {}
      try {
        video.remove();
      } catch (err) {}
    });
  }

  // Scrub specific parts of the YouTube DOM
  function scrubDOM() {
    if (!isContextValid()) return;
    if (!settings.masterSwitch) return;

    // Nuke any active video elements immediately if on Shorts page
    nukeAllVideos();

    // 1. Sidebar Guide Entries (Scrub / Delete)
    if (settings.ytSidebarStrip) {
      document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        const link = el.querySelector('a');
        const text = el.textContent || '';
        if ((link && link.href.includes('/shorts')) || text.toLowerCase().includes('shorts')) {
          blockedElementsSet.add(el);
          el.remove();
          reportBlock(1);
        }
      });
    }

    // 2. Home Feed Grid Shelf (Nuke)
    if (settings.ytGridShelfNuke) {
      document.querySelectorAll('ytd-rich-shelf-renderer, ytd-reel-shelf-renderer').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        const titleEl = el.querySelector('span#title');
        const isShorts = el.hasAttribute('is-shorts') || (titleEl && titleEl.textContent.toLowerCase().includes('shorts'));
        if (isShorts) {
          blockedElementsSet.add(el);
          el.remove();
          reportBlock(1);
        }
      });
    }

    // 3. Channel Tab Vanishing
    if (settings.ytChannelTabRemove) {
      document.querySelectorAll('tp-yt-paper-tab').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        const text = el.textContent || '';
        if (text.toLowerCase().includes('shorts')) {
          blockedElementsSet.add(el);
          el.remove();
          reportBlock(1);
        }
      });
    }

    // 4. Search results filter (removes videos with /shorts/ structure)
    if (settings.ytSearchFilter) {
      document.querySelectorAll('ytd-video-renderer').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        const link = el.querySelector('a#thumbnail');
        if (link && link.href.includes('/shorts/')) {
          blockedElementsSet.add(el);
          el.remove();
          reportBlock(1);
        }
      });
    }

    // 5. Sidebar recommendations & end-screens
    if (settings.ytRecommendationHide) {
      document.querySelectorAll('ytd-compact-video-renderer').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        const link = el.querySelector('a');
        if (link && link.href.includes('/shorts/')) {
          blockedElementsSet.add(el);
          el.remove();
          reportBlock(1);
        }
      });

      document.querySelectorAll('.ytp-ce-element, .ytp-ce-video').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        const link = el.getAttribute('href') || (el.querySelector('a') && el.querySelector('a').getAttribute('href')) || '';
        if (link.includes('/shorts/')) {
          blockedElementsSet.add(el);
          el.remove();
          reportBlock(1);
        }
      });
    }

    // 6. Direct page interception
    checkDirectShortsLink();
  }

  // Handle direct page hit or client-side navigation to /shorts/
  function checkDirectShortsLink() {
    if (window.location.pathname.startsWith('/shorts/')) {
      const blockMode = settings.ytShortsBlockMode;
      if (blockMode === 'camouflage' || blockMode === 'blackout') {
        injectBlockUI(blockMode);
      }
    }
  }

  // Intercept and inject custom UI canvas over Shorts player
  function injectBlockUI(mode) {
    // Find YouTube shorts container
    const shortsApp = document.querySelector('ytd-shorts, #shorts-container, ytd-reel-video-renderer');
    const body = document.body;

    if (!shortsApp) {
      // If the player structure hasn't loaded yet, try again shortly or let MutationObserver catch it
      return;
    }

    if (shortsApp.querySelector('.dsb-blocked-overlay')) {
      return; // Already injected
    }

    // Pause and remove all video elements in the document
    nukeAllVideos();

    // Create custom canvas overlay
    const overlay = document.createElement('div');
    overlay.className = 'dsb-blocked-overlay';

    // Style overlay to cover the whole screen / container
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.fontFamily = '"Roboto", "Arial", sans-serif';

    const isDarkMode = document.documentElement.hasAttribute('dark') || (body && getComputedStyle(body).backgroundColor === 'rgb(15, 15, 15)');

    if (mode === 'camouflage') {
      // YouTube native "Video Unavailable" design system lookalike
      overlay.style.backgroundColor = isDarkMode ? '#0f0f0f' : '#ffffff';
      overlay.style.color = isDarkMode ? '#ffffff' : '#0f0f0f';

      // Circular broken camera/lock SVG
      const iconContainer = document.createElement('div');
      iconContainer.style.width = '96px';
      iconContainer.style.height = '96px';
      iconContainer.style.borderRadius = '50%';
      iconContainer.style.backgroundColor = isDarkMode ? '#1f1f1f' : '#f2f2f2';
      iconContainer.style.display = 'flex';
      iconContainer.style.alignItems = 'center';
      iconContainer.style.justifyContent = 'center';
      iconContainer.style.marginBottom = '24px';
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" fill="${isDarkMode ? '#aaaaaa' : '#606060'}">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
      `;

      // Text block
      const textMsg = document.createElement('h2');
      textMsg.style.fontSize = '18px';
      textMsg.style.fontWeight = '500';
      textMsg.style.textAlign = 'center';
      textMsg.style.marginBottom = '8px';
      textMsg.style.maxWidth = '400px';
      textMsg.textContent = 'This video format has been disabled';

      const subTextMsg = document.createElement('p');
      subTextMsg.style.fontSize = '14px';
      subTextMsg.style.color = isDarkMode ? '#aaaaaa' : '#606060';
      subTextMsg.style.textAlign = 'center';
      subTextMsg.style.marginBottom = '24px';
      subTextMsg.style.maxWidth = '400px';
      subTextMsg.style.lineHeight = '1.4';
      subTextMsg.textContent = 'Short-form videos are blocked to protect your current focus settings.';

      // Pill button
      const button = document.createElement('button');
      button.style.backgroundColor = isDarkMode ? '#ffffff' : '#0f0f0f';
      button.style.color = isDarkMode ? '#0f0f0f' : '#ffffff';
      button.style.border = 'none';
      button.style.padding = '10px 20px';
      button.style.fontSize = '14px';
      button.style.fontWeight = '500';
      button.style.borderRadius = '18px';
      button.style.cursor = 'pointer';
      button.style.transition = 'background-color 0.2s';
      button.textContent = 'Back to Home Feed';
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = isDarkMode ? '#e6e6e6' : '#272727';
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = isDarkMode ? '#ffffff' : '#0f0f0f';
      });
      button.addEventListener('click', () => {
        window.location.href = '/';
      });

      overlay.appendChild(iconContainer);
      overlay.appendChild(textMsg);
      overlay.appendChild(subTextMsg);
      overlay.appendChild(button);

    } else if (mode === 'blackout') {
      // Direct dark blackout mode
      overlay.style.backgroundColor = '#000000';
      overlay.style.color = '#ffffff';

      const lockIcon = document.createElement('div');
      lockIcon.style.marginBottom = '20px';
      lockIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="64" height="64" fill="#ff4d4d">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      `;

      const mainText = document.createElement('div');
      mainText.style.fontSize = '24px';
      mainText.style.fontWeight = 'bold';
      mainText.style.letterSpacing = '1px';
      mainText.style.marginBottom = '12px';
      mainText.textContent = 'THIS VIEW IS BLOCKED';

      const counterText = document.createElement('div');
      counterText.id = 'dsb-blackout-counter';
      counterText.style.fontSize = '14px';
      counterText.style.color = '#888888';
      counterText.textContent = 'Returning you to sanity. Click below to escape.';

      const backBtn = document.createElement('button');
      backBtn.style.marginTop = '30px';
      backBtn.style.backgroundColor = '#333333';
      backBtn.style.color = '#ffffff';
      backBtn.style.border = '1px solid #555555';
      backBtn.style.padding = '12px 28px';
      backBtn.style.fontSize = '14px';
      backBtn.style.borderRadius = '4px';
      backBtn.style.cursor = 'pointer';
      backBtn.textContent = 'Return to Feed';
      backBtn.addEventListener('click', () => {
        window.location.href = '/';
      });

      overlay.appendChild(lockIcon);
      overlay.appendChild(mainText);
      overlay.appendChild(counterText);
      overlay.appendChild(backBtn);
    }

    shortsApp.style.position = 'relative';
    shortsApp.appendChild(overlay);

    reportBlock(1);

    // Apply scroll freezes on the short-form page
    setupScrollLocks(shortsApp);
  }

  // Keyboard & mouse wheel locks
  function setupScrollLocks(container) {
    if (!settings.masterSwitch) return;

    // Prevent mouse wheel / trackpad scroll
    if (settings.lockMouseWheelScroll) {
      const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      container.addEventListener('wheel', preventScroll, { passive: false });
      container.addEventListener('touchmove', preventScroll, { passive: false });
    }

    // Intercept specific scrolling keyboard shortcuts
    if (settings.lockKeyboardScroll) {
      window.addEventListener('keydown', function (e) {
        if (!window.location.pathname.startsWith('/shorts/')) return;
        const keys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '];
        if (keys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }, true);
    }
  }

  // Initialize Mutation Observer targeting SPA updates
  function initBlocker() {
    // Run initial scrubbing
    scrubDOM();

    // Use a persistent MutationObserver targeting the main container structures (ytd-app)
    const observer = new MutationObserver((mutations) => {
      let shouldScrub = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScrub = true;
          break;
        }
      }
      if (shouldScrub) {
        scrubDOM();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Helper to get video from composedPath() to traverse Shadow DOM boundaries
    function getVideoFromEvent(e) {
      if (!e) return null;
      const path = e.composedPath ? e.composedPath() : [];
      return path.find(el => el && el.tagName === 'VIDEO') || (e.target && e.target.tagName === 'VIDEO' ? e.target : null);
    }

    // Capture play and playing events to nuke video before audio renders
    const blockPlayEvent = (e) => {
      if (window.location.pathname.startsWith('/shorts/') && settings.masterSwitch && (settings.ytShortsBlockMode === 'camouflage' || settings.ytShortsBlockMode === 'blackout')) {
        const video = getVideoFromEvent(e);
        if (video) {
          try {
            video.muted = true;
            video.volume = 0;
            video.pause();
            video.src = '';
            video.removeAttribute('src');
            video.load();
          } catch (err) {}
          try {
            video.remove();
          } catch (err) {}
        }
      }
    };

    document.addEventListener('play', blockPlayEvent, true);
    document.addEventListener('playing', blockPlayEvent, true);

    // Continuous interval checks as a fail-safe backup for player restarts.
    // Cleans up resources if extension context gets invalidated.
    const intervalId = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(intervalId);
        observer.disconnect();
        document.removeEventListener('play', blockPlayEvent, true);
        document.removeEventListener('playing', blockPlayEvent, true);
        return;
      }
      nukeAllVideos();
    }, 150);

    // Also run scrub on window navigation events (client-side transitions)
    window.addEventListener('yt-navigate-finish', scrubDOM);
    window.addEventListener('popstate', scrubDOM);
  }
})();
