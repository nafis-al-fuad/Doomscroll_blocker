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
    fbNewsfeedGridFilter: true,
    fbLeftBookmarkRemove: true,
    fbWatchTabPurge: true,
    lockKeyboardScroll: true,
    lockMouseWheelScroll: true
  }, (items) => {
    settings = items;
    applyDynamicCSS();
    initBlocker();
  });

  // Watch for settings changes
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
        scrubDOM();
      }
    }
  });

  // Inject initial styles to hide bookmarks & reels sections
  function applyDynamicCSS() {
    if (!settings.masterSwitch) {
      if (styleElement) {
        styleElement.remove();
        styleElement = null;
      }
      return;
    }

    let css = `
      @keyframes dsb-pulse {
        0% { opacity: 0.4; }
        50% { opacity: 0.8; }
        100% { opacity: 0.4; }
      }
      .dsb-pulse {
        animation: dsb-pulse 1.5s infinite ease-in-out;
      }
    `;

    // Hide left-rail bookmark for Reels (which links to /reels/ or contains Reels text)
    if (settings.fbLeftBookmarkRemove) {
      css += `
        div[role="navigation"] a[href*="/reels/"],
        div[role="navigation"] a[href*="/reel/"] {
          display: none !important;
        }
      `;
    }

    // Hide Watch Tab Reels header/sidebar elements
    if (settings.fbWatchTabPurge) {
      css += `
        a[href*="/watch/subtab/reels/"],
        div[role="banner"] a[href*="/reels/"],
        div[role="banner"] a[href*="/reel/"] {
          display: none !important;
        }
      `;
    }

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'doomscroll-blocker-fb-styles';
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

  // Helper to check if a container has a Reels title/header
  function hasReelsHeader(container) {
    const headings = container.querySelectorAll('h2, h3, h4, span[role="heading"], strong');
    for (let i = 0; i < headings.length; i++) {
      const text = headings[i].textContent.trim();
      if (text === 'Reels' || text === 'Reels and short videos') {
        return true;
      }
    }
    const spans = container.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      const text = spans[i].textContent.trim();
      if (text === 'Reels' || text === 'Reels and short videos') {
        return true;
      }
    }
    return false;
  }

  // Traverses up from a reel link to find the containing feed unit card representing the Reels shelf
  function findReelsContainer(reelLink) {
    let current = reelLink.parentElement;
    while (current && current !== document.body) {
      if (current.tagName === 'DIV') {
        if (hasReelsHeader(current)) {
          const links = current.querySelectorAll('a[href*="/reel/"], a[href*="/reels/"]');
          if (links.length >= 2) {
            return current;
          }
        }
      }
      current = current.parentElement;
    }
    return null;
  }

  // Find and scrub Facebook DOM elements
  function scrubDOM() {
    if (!isContextValid()) return;
    if (!settings.masterSwitch) return;

    // 1. Left-Rail Bookmark Removal (Scrubbing additional elements that link to reels)
    if (settings.fbLeftBookmarkRemove) {
      document.querySelectorAll('a[href*="/reels/"], a[href*="/reel/"]').forEach(el => {
        // Only target left sidebar links
        if (el.closest('div[role="navigation"]') || el.closest('[data-pagelet="LeftRail"]')) {
          if (blockedElementsSet.has(el)) return;
          blockedElementsSet.add(el);
          
          // Nuke the nearest parent list item or container element
          const container = el.closest('li') || el.closest('div[role="listitem"]') || el;
          container.remove();
          reportBlock(1);
        }
      });
    }

    // 2. Watch Tab Purge (Reels section in Watch)
    if (settings.fbWatchTabPurge) {
      document.querySelectorAll('a[href*="/watch/subtab/reels/"], a[href*="/watch/reels/"]').forEach(el => {
        if (blockedElementsSet.has(el)) return;
        blockedElementsSet.add(el);
        const container = el.closest('div[role="listitem"]') || el;
        container.remove();
        reportBlock(1);
      });
    }

    // 3. Newsfeed Grid Reels Carousel (Skeleton Loader Card replacement)
    if (settings.fbNewsfeedGridFilter) {
      document.querySelectorAll('a[href*="/reel/"], a[href*="/reels/"]').forEach(link => {
        // Skip links inside left navigation sidebar
        if (link.closest('div[role="navigation"]') || link.closest('[data-pagelet="LeftRail"]')) {
          return;
        }

        const reelsContainer = findReelsContainer(link);
        if (reelsContainer && !blockedElementsSet.has(reelsContainer)) {
          blockedElementsSet.add(reelsContainer);
          replaceWithSkeletonCard(reelsContainer);
        }
      });
    }

    // Direct url scroll locks
    if (window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/')) {
      setupScrollLocks();
    }
  }

  // Helper to reliably detect Facebook's current active theme (Light or Dark Mode)
  function isDarkModeActive(element) {
    const htmlEl = document.documentElement;
    const body = document.body;
    
    // 1. Check classes on root and body
    if (htmlEl.classList.contains('__fb-dark-mode') || htmlEl.classList.contains('dark')) {
      return true;
    }
    if (body && (body.classList.contains('__fb-dark-mode') || body.classList.contains('dark'))) {
      return true;
    }
    
    // 2. Check document text color (Light text = Dark theme)
    try {
      const colorVal = getComputedStyle(htmlEl).color;
      const rgb = colorVal.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
        // If the text color is bright, we are displaying light text on a dark background (dark mode)
        if ((r + g + b) / 3 > 150) {
          return true;
        }
      }
    } catch (e) {}

    // Helper to analyze RGB dark colors
    const isDarkColor = (colorStr) => {
      if (!colorStr || colorStr === 'transparent' || colorStr.includes('rgba(0, 0, 0, 0)')) return false;
      const rgb = colorStr.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
        return (r + g + b) / 3 < 100; // Average channel is dark
      }
      return false;
    };

    // 3. Check computed background colors of elements
    try {
      if (isDarkColor(getComputedStyle(htmlEl).backgroundColor)) return true;
      if (body && isDarkColor(getComputedStyle(body).backgroundColor)) return true;
      if (element && isDarkColor(getComputedStyle(element).backgroundColor)) return true;
      if (element && element.parentElement && isDarkColor(getComputedStyle(element.parentElement).backgroundColor)) return true;
    } catch (e) {}

    // 4. Check CSS custom properties
    try {
      const cardBg = getComputedStyle(htmlEl).getPropertyValue('--card-background').trim();
      if (cardBg === '#242526' || cardBg.includes('36, 37, 38') || cardBg.includes('24, 25, 26')) {
        return true;
      }
    } catch (e) {}

    // 5. Check media query for system preference (Facebook matches system setting)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }

    return false;
  }

  // Replace Reels feed shelf with a beautiful pulsing Skeleton Card that matches the active theme
  function replaceWithSkeletonCard(element) {
    // Clear element contents
    element.innerHTML = '';

    const isDark = isDarkModeActive(element);

    // Theme values matching Facebook design system (Gecko)
    const cardBgColor = isDark ? '#242526' : '#ffffff';
    const borderColor = isDark ? '#3e4042' : '#e5e5e5';
    const washColor = isDark ? '#3a3b3c' : '#e4e6eb';
    const textColor = isDark ? '#b0b3b8' : '#65676b';
    const overlayBgColor = isDark ? 'rgba(24, 25, 26, 0.4)' : 'rgba(255, 255, 255, 0.4)';
    const textNudgeBg = isDark ? '#1c1d1f' : '#ffffff';

    // Create Facebook-styled card container
    const card = document.createElement('div');
    card.style.background = cardBgColor;
    card.style.border = `1px solid ${borderColor}`;
    card.style.borderRadius = '8px';
    card.style.boxShadow = isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)';
    card.style.padding = '16px';
    card.style.margin = '12px 0';
    card.style.position = 'relative';
    card.style.fontFamily = 'Segoe UI, Helvetica, Arial, sans-serif';
    card.style.boxSizing = 'border-box';
    card.style.overflow = 'hidden';

    // Mock header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '16px';

    const avatar = document.createElement('div');
    avatar.className = 'dsb-pulse';
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.background = washColor;
    avatar.style.marginRight = '12px';

    const textLines = document.createElement('div');
    textLines.style.flex = '1';

    const line1 = document.createElement('div');
    line1.className = 'dsb-pulse';
    line1.style.width = '80px';
    line1.style.height = '12px';
    line1.style.borderRadius = '6px';
    line1.style.background = washColor;
    line1.style.marginBottom = '6px';

    const line2 = document.createElement('div');
    line2.className = 'dsb-pulse';
    line2.style.width = '40px';
    line2.style.height = '8px';
    line2.style.borderRadius = '4px';
    line2.style.background = washColor;

    textLines.appendChild(line1);
    textLines.appendChild(line2);
    header.appendChild(avatar);
    header.appendChild(textLines);
    card.appendChild(header);

    // Mock Reels layout (Three pulsing blocks)
    const blocksContainer = document.createElement('div');
    blocksContainer.style.display = 'flex';
    blocksContainer.style.justifyContent = 'space-between';
    blocksContainer.style.gap = '8px';
    blocksContainer.style.height = '180px';
    blocksContainer.style.marginBottom = '8px';

    for (let i = 0; i < 3; i++) {
      const block = document.createElement('div');
      block.className = 'dsb-pulse';
      block.style.flex = '1';
      block.style.background = washColor;
      block.style.borderRadius = '6px';
      block.style.height = '100%';
      blocksContainer.appendChild(block);
    }
    card.appendChild(blocksContainer);

    // Overlay nudge text
    const textOverlay = document.createElement('div');
    textOverlay.style.position = 'absolute';
    textOverlay.style.top = '0';
    textOverlay.style.left = '0';
    textOverlay.style.width = '100%';
    textOverlay.style.height = '100%';
    textOverlay.style.background = overlayBgColor;
    textOverlay.style.display = 'flex';
    textOverlay.style.alignItems = 'center';
    textOverlay.style.justifyContent = 'center';
    textOverlay.style.padding = '20px';
    textOverlay.style.boxSizing = 'border-box';

    const textNudge = document.createElement('span');
    textNudge.style.color = textColor;
    textNudge.style.fontSize = '13px';
    textNudge.style.fontWeight = '500';
    textNudge.style.textAlign = 'center';
    textNudge.style.lineHeight = '1.4';
    textNudge.style.maxWidth = '260px';
    textNudge.style.padding = '8px 12px';
    textNudge.style.background = textNudgeBg;
    textNudge.style.border = `1px solid ${borderColor}`;
    textNudge.style.borderRadius = '6px';
    textNudge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    textNudge.textContent = 'Short-form feeds are hidden in your current profile configuration.';

    textOverlay.appendChild(textNudge);
    card.appendChild(textOverlay);

    element.appendChild(card);
    reportBlock(1);
  }

  // Hardware scrolling locks
  function setupScrollLocks() {
    if (!settings.masterSwitch) return;

    const mainContainer = document.querySelector('div[role="main"]') || document.body;

    // Prevent wheel scrolling
    if (settings.lockMouseWheelScroll) {
      const preventScroll = (e) => {
        if (window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      window.addEventListener('wheel', preventScroll, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
    }

    // Keyboard Arrow/Space locks
    if (settings.lockKeyboardScroll) {
      window.addEventListener('keydown', function (e) {
        if (!window.location.pathname.includes('/reel/') && !window.location.pathname.includes('/reels/')) return;
        const keys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '];
        if (keys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }, true);
    }
  }

  // Initialize Mutation Observer targeting SPA changes
  function initBlocker() {
    scrubDOM();

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

    // Observe body for dynamic page layout shifts
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Cleanup watcher if extension context gets invalidated (extension reload)
    const cleanupInterval = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(cleanupInterval);
        observer.disconnect();
        return;
      }
    }, 1000);

    // Listen to pushState / popState updates for SPA navigation
    window.addEventListener('popstate', scrubDOM);
    window.addEventListener('click', () => {
      // Quick delay to catch client-side routing changes
      if (!isContextValid()) return;
      setTimeout(scrubDOM, 200);
    });
  }
})();
