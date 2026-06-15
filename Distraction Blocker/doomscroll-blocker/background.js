// Default settings structure
const DEFAULT_SETTINGS = {
  masterSwitch: true,
  ytShortsBlockMode: 'camouflage', // 'camouflage', 'blackout', 'convert-watch', 'redirect', 'disabled'
  ytSidebarStrip: true,
  ytGridShelfNuke: true,
  ytSearchFilter: true,
  ytChannelTabRemove: true,
  ytRecommendationHide: true,
  fbLeftBookmarkRemove: true,
  fbWatchTabPurge: true,
  fbNewsfeedGridFilter: true,
  lockKeyboardScroll: true,
  lockMouseWheelScroll: true,
  optionsLockEnabled: false,
  optionsLockPhrase: '', // Phrase to unlock options
  totalBlocksCount: 0,
  timeSavedMinutes: 0
};

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (items) => {
    const updatedSettings = { ...DEFAULT_SETTINGS };
    for (const key in DEFAULT_SETTINGS) {
      if (items[key] !== undefined) {
        updatedSettings[key] = items[key];
      }
    }
    chrome.storage.local.set(updatedSettings);
  });

  // Set initial badge colors
  chrome.action.setBadgeBackgroundColor({ color: '#333333' }); // Soft neutral charcoal gray
  chrome.action.setBadgeTextColor({ color: '#ffffff' });
});

// Setup Action Click to open Options Page
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Helper to update the extension action badge
async function updateBadge() {
  try {
    const sessionData = await chrome.storage.session.get({ sessionBlocks: 0 });
    const count = sessionData.sessionBlocks;
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    // Fallback if chrome.storage.session is not supported
    console.error('Session storage error:', e);
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'incrementBlocked') {
    const increment = message.count || 1;

    // 1. Update session blocks
    chrome.storage.session.get({ sessionBlocks: 0 }, (sData) => {
      const newSessionBlocks = sData.sessionBlocks + increment;
      chrome.storage.session.set({ sessionBlocks: newSessionBlocks }, () => {
        updateBadge();
      });
    });

    // 2. Update overall blocks in local storage
    chrome.storage.local.get({ totalBlocksCount: 0, timeSavedMinutes: 0 }, (lData) => {
      const newTotal = lData.totalBlocksCount + increment;
      // Assume average of 45 seconds (0.75 mins) saved per short-form video avoided
      const newTimeSaved = Math.round(newTotal * 0.75 * 10) / 10; 
      chrome.storage.local.set({
        totalBlocksCount: newTotal,
        timeSavedMinutes: newTimeSaved
      });
    });
  }
  
  if (message.action === 'getSettings') {
    chrome.storage.local.get(null, (settings) => {
      sendResponse(settings);
    });
    return true; // Keep channel open for async response
  }
});

// Watch-Page Conversion and URL Redirection Interceptor
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept main frame navigations
  if (details.frameId !== 0) return;

  const url = details.url;
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

  if (!settings.masterSwitch) return;

  // 1. YouTube Shorts check
  if (url.includes('youtube.com/shorts/')) {
    const parts = url.split('/shorts/');
    if (parts.length > 1) {
      const shortId = parts[1].split(/[?#]/)[0];
      
      if (settings.ytShortsBlockMode === 'convert-watch') {
        const watchUrl = `https://www.youtube.com/watch?v=${shortId}`;
        chrome.tabs.update(details.tabId, { url: watchUrl });
      } else if (settings.ytShortsBlockMode === 'redirect') {
        chrome.tabs.update(details.tabId, { url: 'https://www.youtube.com/' });
      } else if (settings.ytShortsBlockMode === 'camouflage' || settings.ytShortsBlockMode === 'blackout') {
        // Mute the tab at the browser level immediately to block early audio render
        chrome.tabs.update(details.tabId, { muted: true });
      }
    }
  } else if (url.includes('youtube.com')) {
    // Unmute the tab when navigating to a regular YouTube page
    chrome.tabs.update(details.tabId, { muted: false });
  }

  // 2. Facebook Reels check
  if (url.includes('facebook.com/reel/') || url.includes('facebook.com/reels/')) {
    if (settings.fbNewsfeedGridFilter) {
      // Redirect direct Reels link to Facebook home feed
      chrome.tabs.update(details.tabId, { url: 'https://www.facebook.com/' });
    }
  }
}, { url: [{ hostSuffix: 'youtube.com' }, { hostSuffix: 'facebook.com' }] });

// Listen for tab updates to catch SPA client-side history API routing updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // We check tab.url or changeInfo.url to cover SPA updates
  const url = changeInfo.url || tab.url || '';
  if (!url) return;

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

  if (!settings.masterSwitch) return;

  // YouTube Shorts checks
  if (url.includes('youtube.com/shorts/')) {
    const parts = url.split('/shorts/');
    if (parts.length > 1) {
      const shortId = parts[1].split(/[?#]/)[0];
      if (settings.ytShortsBlockMode === 'convert-watch') {
        chrome.tabs.update(tabId, { url: `https://www.youtube.com/watch?v=${shortId}` });
      } else if (settings.ytShortsBlockMode === 'redirect') {
        chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
      } else if (settings.ytShortsBlockMode === 'camouflage' || settings.ytShortsBlockMode === 'blackout') {
        // Mute tab to prevent sound leaking on navigation
        chrome.tabs.update(tabId, { muted: true });
      }
    }
  } else if (url.includes('youtube.com')) {
    // Unmute when returning to normal youtube pages
    chrome.tabs.update(tabId, { muted: false });
  }

  // Facebook Reels checks
  if (url.includes('facebook.com/reel/') || url.includes('facebook.com/reels/')) {
    if (settings.fbNewsfeedGridFilter) {
      chrome.tabs.update(tabId, { url: 'https://www.facebook.com/' });
    }
  }
});
