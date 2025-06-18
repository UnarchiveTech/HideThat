document.addEventListener('DOMContentLoaded', function() {
  // --- STATE MANAGEMENT ---
  let state = {
    activeTab: 'instagram', // 'instagram', 'twitter', 'linkedin', or 'global'
    settings: {
      instagram: {},
      twitter: {},
      linkedin: {},
      global: {}
    },
    isRelevantPage: false,
  };

  const defaultSettings = {
    instagram: {
      usernameBlur: true,
      fullNameBlur: true,
      usernameReplaceMode: false,
      fullNameReplaceMode: false,
      usernameReplaceText: '[username]',
      fullNameReplaceText: '[name]',
    },
    twitter: {
    usernameBlur: true, 
    fullNameBlur: true,
    usernameReplaceMode: false,
    fullNameReplaceMode: false,
    usernameReplaceText: '[username]',
    fullNameReplaceText: '[name]',
    },
    linkedin: {
      usernameBlur: false, // Not applicable for LinkedIn
      fullNameBlur: true,
      usernameReplaceMode: false,
      fullNameReplaceMode: false,
      usernameReplaceText: '',
      fullNameReplaceText: '[name]',
    },
    global: {
      customWordsBlur: true,
      customWordsReplaceMode: false,
    customWordsReplaceText: '[hidden]',
    customWordsList: '',
    }
  };

  // --- UI ELEMENTS ---
  const ui = {
    tabs: document.querySelectorAll('.platform-tab-button'),
    platformSettings: document.getElementById('platform-settings'),
    globalSettings: document.getElementById('global-settings'),
    error: document.getElementById('error'),
    // Platform sections
    usernameSection: document.getElementById('username-section'),
    fullnameSection: document.getElementById('fullname-section'),
    // Platform-specific controls
    usernameDisplay: document.getElementById('username-display'),
    usernameBlur: document.getElementById('username-blur'),
    usernameBlurMode: document.querySelector('input[name="username-mode"][value="blur"]'),
    usernameReplaceMode: document.querySelector('input[name="username-mode"][value="replace"]'),
    usernameReplaceContainer: document.getElementById('username-replace-container'),
    usernameReplaceText: document.getElementById('username-replace-text'),
    fullnameDisplay: document.getElementById('fullname-display'),
    fullnameBlur: document.getElementById('fullname-blur'),
    fullnameBlurMode: document.querySelector('input[name="fullname-mode"][value="blur"]'),
    fullnameReplaceMode: document.querySelector('input[name="fullname-mode"][value="replace"]'),
    fullnameReplaceContainer: document.getElementById('fullname-replace-container'),
    fullnameReplaceText: document.getElementById('fullname-replace-text'),
    // Global controls
    customWordsBlur: document.getElementById('custom-words-blur'),
    customWordsBlurMode: document.querySelector('input[name="custom-words-mode"][value="blur"]'),
    customWordsReplaceMode: document.querySelector('input[name="custom-words-mode"][value="replace"]'),
    customWordsReplaceContainer: document.getElementById('custom-words-replace-container'),
    customWordsReplaceText: document.getElementById('custom-words-replace-text'),
    customWordsList: document.getElementById('custom-words-list'),
    // Footer
    refreshButton: document.getElementById('refresh-button'),
    saveConfirmation: document.createElement('div'),
  };
  
  // --- RENDER & UI LOGIC FUNCTIONS ---
  function render() {
    const platform = state.activeTab;
    const isPlatform = platform === 'instagram' || platform === 'twitter' || platform === 'linkedin';
    const isGlobal = platform === 'global';
    
    // Update tab visibility
    ui.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === platform));
    ui.platformSettings.classList.toggle('active', isPlatform);
    ui.globalSettings.classList.toggle('active', isGlobal);

    // Reset common UI states
    ui.error.style.display = 'none';
    [ui.usernameSection, ui.fullnameSection].forEach(el => {
      el.classList.remove('disabled');
      el.querySelectorAll('input').forEach(input => input.disabled = false);
    });
    
    // Populate controls based on active tab
    if (isPlatform) {
      const s = state.settings[platform];
      
      // Handle page relevance (only for platform tabs)
      if (!state.isRelevantPage) {
        ui.error.textContent = `Navigate to a ${platform} page to see options.`;
        ui.error.style.display = 'block';
        [ui.usernameSection, ui.fullnameSection].forEach(el => {
            el.classList.add('disabled');
            el.querySelectorAll('input').forEach(input => input.disabled = true);
        });
      }

      // Handle LinkedIn specifics
      const isLinkedIn = platform === 'linkedin';
      ui.usernameSection.style.display = isLinkedIn ? 'none' : 'block';
      if (!isLinkedIn) {
        ui.usernameBlur.checked = s.usernameBlur;
        ui.usernameReplaceMode.checked = s.usernameReplaceMode;
        ui.usernameBlurMode.checked = !s.usernameReplaceMode;
        ui.usernameReplaceText.value = s.usernameReplaceText;
        ui.usernameReplaceContainer.classList.toggle('visible', s.usernameReplaceMode);
      }
      
      ui.fullnameBlur.checked = s.fullNameBlur;
      ui.fullnameReplaceMode.checked = s.fullNameReplaceMode;
      ui.fullnameBlurMode.checked = !s.fullNameReplaceMode;
      ui.fullnameReplaceText.value = s.fullNameReplaceText;
      ui.fullnameReplaceContainer.classList.toggle('visible', s.fullNameReplaceMode);
      
      loadProfileInfo();

    } else if (isGlobal) {
      const s = state.settings.global;
      ui.customWordsBlur.checked = s.customWordsBlur;
      ui.customWordsReplaceMode.checked = s.customWordsReplaceMode;
      ui.customWordsBlurMode.checked = !s.customWordsReplaceMode;
      ui.customWordsReplaceText.value = s.customWordsReplaceText;
      ui.customWordsList.value = s.customWordsList;
      ui.customWordsReplaceContainer.classList.toggle('visible', s.customWordsReplaceMode);
    }
  }

  // --- DATA & SYNC FUNCTIONS ---
  function saveState() {
    const platform = state.activeTab;
    const isPlatform = platform === 'instagram' || platform === 'twitter' || platform === 'linkedin';

    if (isPlatform) {
      state.settings[platform] = {
        usernameBlur: ui.usernameBlur.checked,
        fullNameBlur: ui.fullnameBlur.checked,
        usernameReplaceMode: ui.usernameReplaceMode.checked,
        fullNameReplaceMode: ui.fullnameReplaceMode.checked,
        usernameReplaceText: ui.usernameReplaceText.value,
        fullNameReplaceText: ui.fullnameReplaceText.value,
      };
    } else { // Global
       state.settings.global = {
        customWordsBlur: ui.customWordsBlur.checked,
        customWordsReplaceMode: ui.customWordsReplaceMode.checked,
        customWordsReplaceText: ui.customWordsReplaceText.value,
        customWordsList: ui.customWordsList.value,
      };
    }
    
    chrome.storage.sync.set({ settings: state.settings }, () => {
      updateContentScript();
      showSaveConfirmation();
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    });
  }

  function showSaveConfirmation() {
    if (!document.body.contains(ui.saveConfirmation)) {
      ui.saveConfirmation.textContent = 'Saved!';
      ui.saveConfirmation.style.cssText = `
        position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%);
        background-color: var(--primary-color); color: white; padding: 8px 16px;
        border-radius: 20px; font-size: 14px; z-index: 100;
        opacity: 0; transition: opacity 0.3s, transform 0.3s;
      `;
      document.body.appendChild(ui.saveConfirmation);
    }
    
    setTimeout(() => {
        ui.saveConfirmation.style.opacity = '1';
        ui.saveConfirmation.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    setTimeout(() => {
      ui.saveConfirmation.style.opacity = '0';
      ui.saveConfirmation.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2000);
  }

  function updateContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0] || !tabs[0].url) return;
      const tab = tabs[0];

      const isInstagram = tab.url.includes('instagram.com');
      const isTwitter = tab.url.includes('twitter.com') || tab.url.includes('x.com');
      const isLinkedIn = tab.url.includes('linkedin.com');

      if (isInstagram || isTwitter || isLinkedIn) {
        const platform = isInstagram ? 'instagram' : (isTwitter ? 'twitter' : 'linkedin');
        const payload = {
          action: 'updateBlurSettings',
          settings: {
            ...state.settings[platform],
            ...state.settings.global,
          }
        };
        chrome.tabs.sendMessage(tab.id, payload, () => {
          if (chrome.runtime.lastError) { /* ignore error if content script not ready */ }
        });
      }
    });
  }

  function loadProfileInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0] || !tabs[0].id || !tabs[0].url) {
        ui.error.style.display = 'block';
        return;
      }
      
      const currentUrl = tabs[0].url;
      let platform = null;
      if (currentUrl.includes('instagram.com')) platform = 'instagram';
      else if (currentUrl.includes('twitter.com') || currentUrl.includes('x.com')) platform = 'twitter';
      else if (currentUrl.includes('linkedin.com')) platform = 'linkedin';

      // Only try to get info if the active tab in the popup matches the page
      if (state.activeTab !== platform) {
        ui.usernameDisplay.textContent = 'N/A';
        ui.fullnameDisplay.textContent = 'N/A';
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getProfileInfo' }, function(response) {
        if (chrome.runtime.lastError || !response) {
          ui.usernameDisplay.textContent = 'Not Found';
          ui.fullnameDisplay.textContent = 'Not Found';
          return;
        }
        
        ui.usernameDisplay.textContent = response.username || 'N/A';
        ui.fullnameDisplay.textContent = response.fullName || 'N/A';
      });
    });
  }

  // --- INITIALIZATION ---
  chrome.storage.sync.get({ settings: defaultSettings }, (data) => {
    state.settings = data.settings;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url) {
        const url = tab.url;
        let platform = null;
        if (url.includes('instagram.com')) platform = 'instagram';
        else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
        else if (url.includes('linkedin.com')) platform = 'linkedin';

        if (platform) {
            state.activeTab = platform;
            state.isRelevantPage = true;
        } else {
            state.activeTab = 'instagram'; // Default tab
            state.isRelevantPage = false;
        }
      }
      render();
      updateContentScript(); // Initial sync with content script
    });
  });

  // --- EVENT LISTENERS ---
  ui.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      state.activeTab = e.target.dataset.tab;
      // Check relevance again when switching tabs
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        if (state.activeTab === 'instagram') state.isRelevantPage = url.includes('instagram.com');
        else if (state.activeTab === 'twitter') state.isRelevantPage = url.includes('twitter.com') || url.includes('x.com');
        else if (state.activeTab === 'linkedin') state.isRelevantPage = url.includes('linkedin.com');
        else state.isRelevantPage = true; // Global tab is always "relevant"
        render();
      });
    });
  });

  ui.refreshButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'update' }, () => {
          if (chrome.runtime.lastError) { /* ignore */ } 
          else { loadProfileInfo(); }
        });
      }
    });
  });

  document.body.addEventListener('input', (e) => {
    // This single listener handles all inputs and saves state
    // It also triggers re-rendering for the replace containers
    saveState();
    if (e.target.name && e.target.name.endsWith('-mode')) {
        render();
    }
  });
});