document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const navTargets = document.getElementById('nav-targets');
  const navAnalytics = document.getElementById('nav-analytics');
  const navSettings = document.getElementById('nav-settings');
  
  const sectionTargets = document.getElementById('section-targets');
  const sectionAnalytics = document.getElementById('section-analytics');
  const sectionSettings = document.getElementById('section-settings');

  // Input elements
  const masterSwitch = document.getElementById('master-switch');
  const masterStatusText = document.getElementById('master-status-text');
  
  const ytBlockMode = document.getElementById('yt-block-mode');
  const ytSidebarStrip = document.getElementById('yt-sidebar-strip');
  const ytGridShelfNuke = document.getElementById('yt-grid-shelf-nuke');
  const ytSearchFilter = document.getElementById('yt-search-filter');
  const ytChannelTabRemove = document.getElementById('yt-channel-tab-remove');
  const ytRecommendationHide = document.getElementById('yt-recommendation-hide');
  
  const fbNewsfeedGridFilter = document.getElementById('fb-newsfeed-grid-filter');
  const fbLeftBookmarkRemove = document.getElementById('fb-left-bookmark-remove');
  const fbWatchTabPurge = document.getElementById('fb-watch-tab-purge');
  
  const optionsLockEnabled = document.getElementById('options-lock-enabled');
  const lockKeyboardScroll = document.getElementById('lock-keyboard-scroll');
  const lockMouseWheelScroll = document.getElementById('lock-mouse-wheel-scroll');

  // Statistics elements
  const statTotalBlocked = document.getElementById('stat-total-blocked');
  const statTimeSaved = document.getElementById('stat-time-saved');

  // Lock Challenge Elements
  const lockOverlay = document.getElementById('lock-overlay');
  const targetPhrase = document.getElementById('target-phrase');
  const challengeInput = document.getElementById('challenge-input');
  const unlockBtn = document.getElementById('unlock-btn');

  // Countdown Elements
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownTimer = document.getElementById('countdown-timer');
  const cancelDisableBtn = document.getElementById('cancel-disable-btn');
  const confirmDisableBtn = document.getElementById('confirm-disable-btn');

  // Focus Quotes for Locking challenge (6-8 words, inspiring and clear)
  const focusPhrases = [
    "Focus on your goals and let go.",
    "Your attention is your most valuable asset.",
    "Deep work produces results that actually matter.",
    "Disconnect from noise to find your focus.",
    "Quiet the mind and do the work.",
    "Small daily improvements lead to massive results.",
    "Action cures fear and builds your focus.",
    "Choose what to ignore to make progress."
  ];

  let countdownInterval = null;

  // --- 1. Navigation Controller ---
  const navItems = [
    { button: navTargets, section: sectionTargets },
    { button: navAnalytics, section: sectionAnalytics },
    { button: navSettings, section: sectionSettings }
  ];

  navItems.forEach(item => {
    item.button.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Toggle active states on buttons
      navItems.forEach(i => i.button.classList.remove('active'));
      item.button.classList.add('active');

      // Toggle sections visibility
      navItems.forEach(i => i.section.classList.add('hidden'));
      item.section.classList.remove('hidden');

      // Update statistics and quotes dynamically if Analytics is viewed
      if (item.button === navAnalytics) {
        loadStats();
      }
    });
  });

  // --- 2. Load and Sync Settings ---
  function loadSettings() {
    chrome.storage.local.get({
      masterSwitch: true,
      ytShortsBlockMode: 'camouflage',
      ytSidebarStrip: true,
      ytGridShelfNuke: true,
      ytSearchFilter: true,
      ytChannelTabRemove: true,
      ytRecommendationHide: true,
      fbNewsfeedGridFilter: true,
      fbLeftBookmarkRemove: true,
      fbWatchTabPurge: true,
      optionsLockEnabled: false,
      lockKeyboardScroll: true,
      lockMouseWheelScroll: true
    }, (items) => {
      // Set UI states
      masterSwitch.checked = items.masterSwitch;
      updateMasterStatusText(items.masterSwitch);

      ytBlockMode.value = items.ytShortsBlockMode;
      ytSidebarStrip.checked = items.ytSidebarStrip;
      ytGridShelfNuke.checked = items.ytGridShelfNuke;
      ytSearchFilter.checked = items.ytSearchFilter;
      ytChannelTabRemove.checked = items.ytChannelTabRemove;
      ytRecommendationHide.checked = items.ytRecommendationHide;

      fbNewsfeedGridFilter.checked = items.fbNewsfeedGridFilter;
      fbLeftBookmarkRemove.checked = items.fbLeftBookmarkRemove;
      fbWatchTabPurge.checked = items.fbWatchTabPurge;

      optionsLockEnabled.checked = items.optionsLockEnabled;
      lockKeyboardScroll.checked = items.lockKeyboardScroll;
      lockMouseWheelScroll.checked = items.lockMouseWheelScroll;

      // Handle Lock Screen Trigger on page load
      if (items.optionsLockEnabled) {
        triggerLockScreen();
      } else {
        lockOverlay.classList.add('hidden');
      }
    });

    loadStats();
  }

  function loadStats() {
    chrome.storage.local.get({
      totalBlocksCount: 0,
      timeSavedMinutes: 0
    }, (stats) => {
      statTotalBlocked.textContent = stats.totalBlocksCount;
      // Convert minutes to hours with 1 decimal place
      const hours = (stats.timeSavedMinutes / 60).toFixed(1);
      statTimeSaved.textContent = hours;
    });
  }

  function updateMasterStatusText(active) {
    if (active) {
      masterStatusText.textContent = 'Active';
      masterStatusText.className = 'master-status';
    } else {
      masterStatusText.textContent = 'Inactive';
      masterStatusText.className = 'master-status inactive';
    }
  }

  // --- 3. Save Settings in Storage ---
  const settingsInputs = [
    { el: ytBlockMode, key: 'ytShortsBlockMode' },
    { el: ytSidebarStrip, key: 'ytSidebarStrip' },
    { el: ytGridShelfNuke, key: 'ytGridShelfNuke' },
    { el: ytSearchFilter, key: 'ytSearchFilter' },
    { el: ytChannelTabRemove, key: 'ytChannelTabRemove' },
    { el: ytRecommendationHide, key: 'ytRecommendationHide' },
    { el: fbNewsfeedGridFilter, key: 'fbNewsfeedGridFilter' },
    { el: fbLeftBookmarkRemove, key: 'fbLeftBookmarkRemove' },
    { el: fbWatchTabPurge, key: 'fbWatchTabPurge' },
    { el: optionsLockEnabled, key: 'optionsLockEnabled' },
    { el: lockKeyboardScroll, key: 'lockKeyboardScroll' },
    { el: lockMouseWheelScroll, key: 'lockMouseWheelScroll' }
  ];

  settingsInputs.forEach(input => {
    const eventType = input.el.tagName === 'SELECT' ? 'change' : 'click';
    input.el.addEventListener(eventType, () => {
      const val = input.el.tagName === 'SELECT' ? input.el.value : input.el.checked;
      chrome.storage.local.set({ [input.key]: val });
    });
  });

  // --- 4. Master Switch Blocker Deactivation Countdown ---
  masterSwitch.addEventListener('change', (e) => {
    if (!masterSwitch.checked) {
      // Re-check visually until the countdown confirms deactivation
      masterSwitch.checked = true;
      triggerCountdownOverlay();
    } else {
      // Toggle ON immediately
      chrome.storage.local.set({ masterSwitch: true });
      updateMasterStatusText(true);
    }
  });

  function triggerCountdownOverlay() {
    countdownOverlay.classList.remove('hidden');
    confirmDisableBtn.disabled = true;
    
    let totalSeconds = 180; // 3 minutes
    updateCountdownUI(totalSeconds);

    countdownInterval = setInterval(() => {
      totalSeconds--;
      updateCountdownUI(totalSeconds);

      if (totalSeconds <= 0) {
        clearInterval(countdownInterval);
        confirmDisableBtn.disabled = false;
      }
    }, 1000);
  }

  function updateCountdownUI(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSecs = secs < 10 ? '0' + secs : secs;
    countdownTimer.textContent = `0${mins}:${paddedSecs}`;
  }

  cancelDisableBtn.addEventListener('click', () => {
    clearInterval(countdownInterval);
    countdownOverlay.classList.add('hidden');
    masterSwitch.checked = true;
  });

  confirmDisableBtn.addEventListener('click', () => {
    clearInterval(countdownInterval);
    countdownOverlay.classList.add('hidden');
    masterSwitch.checked = false;
    chrome.storage.local.set({ masterSwitch: false });
    updateMasterStatusText(false);
  });

  // --- 5. Typing Challenge Lock overlay ---
  function triggerLockScreen() {
    lockOverlay.classList.remove('hidden');
    challengeInput.value = '';
    unlockBtn.disabled = true;
    
    // Choose random phrase
    const randomIdx = Math.floor(Math.random() * focusPhrases.length);
    const phrase = focusPhrases[randomIdx];
    targetPhrase.textContent = phrase;
  }

  // Prevent copy paste operations on input
  challengeInput.addEventListener('paste', (e) => {
    e.preventDefault();
  });

  challengeInput.addEventListener('input', () => {
    const target = targetPhrase.textContent.trim().toLowerCase();
    const typed = challengeInput.value.trim().toLowerCase();

    // Check exact matches
    if (typed === target) {
      unlockBtn.disabled = false;
      challengeInput.style.borderColor = 'var(--accent-green)';
    } else {
      unlockBtn.disabled = true;
      challengeInput.style.borderColor = 'var(--border-color)';
    }
  });

  unlockBtn.addEventListener('click', () => {
    const target = targetPhrase.textContent.trim().toLowerCase();
    const typed = challengeInput.value.trim().toLowerCase();

    if (typed === target) {
      lockOverlay.classList.add('hidden');
      challengeInput.value = '';
    }
  });

  // Initialize
  loadSettings();
});
