document.addEventListener('DOMContentLoaded', function() {
  // Platform tab switching
  const platformTabs = document.querySelectorAll('.platform-tab-button');
  const platformContents = document.querySelectorAll('.platform-content');
  let currentPlatform = 'instagram';

  platformTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      platformTabs.forEach(t => t.classList.remove('active'));
      platformContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const platform = tab.dataset.platform;
      document.getElementById(`${platform}-tab`).classList.add('active');
      currentPlatform = platform;
      loadProfileInfo();
    });
  });

  // Instagram elements
  const usernameBlur = document.getElementById('usernameBlur');
  const fullNameBlur = document.getElementById('fullNameBlur');
  const customWordsBlur = document.getElementById('customWordsBlur');
  const usernameBlurMode = document.getElementById('usernameBlurMode');
  const usernameReplaceMode = document.getElementById('usernameReplaceMode');
  const fullNameBlurMode = document.getElementById('fullNameBlurMode');
  const fullNameReplaceMode = document.getElementById('fullNameReplaceMode');
  const customWordsBlurMode = document.getElementById('customWordsBlurMode');
  const customWordsReplaceMode = document.getElementById('customWordsReplaceMode');
  const usernameReplaceText = document.getElementById('usernameReplaceText');
  const fullNameReplaceText = document.getElementById('fullNameReplaceText');
  const customWordsReplaceText = document.getElementById('customWordsReplaceText');
  const customWordsList = document.getElementById('customWordsList');

  // Twitter elements
  const twitterUsernameBlur = document.getElementById('twitter-usernameBlur');
  const twitterFullNameBlur = document.getElementById('twitter-fullNameBlur');
  const twitterUsernameBlurMode = document.getElementById('twitter-usernameBlurMode');
  const twitterUsernameReplaceMode = document.getElementById('twitter-usernameReplaceMode');
  const twitterFullNameBlurMode = document.getElementById('twitter-fullNameBlurMode');
  const twitterFullNameReplaceMode = document.getElementById('twitter-fullNameReplaceMode');
  const twitterUsernameReplaceText = document.getElementById('twitter-usernameReplaceText');
  const twitterFullNameReplaceText = document.getElementById('twitter-fullNameReplaceText');

  // Load saved preferences for both platforms
  chrome.storage.sync.get({
    usernameBlur: true, 
    fullNameBlur: true,
    customWordsBlur: true,
    usernameReplaceMode: false,
    fullNameReplaceMode: false,
    customWordsReplaceMode: false,
    usernameReplaceText: '[username]',
    fullNameReplaceText: '[name]',
    customWordsReplaceText: '[hidden]',
    customWordsList: '',
    // Twitter preferences
    twitterUsernameBlur: true,
    twitterFullNameBlur: true,
    twitterUsernameReplaceMode: false,
    twitterFullNameReplaceMode: false,
    twitterUsernameReplaceText: '[username]',
    twitterFullNameReplaceText: '[name]'
  }, function(result) {
    usernameBlur.checked = result.usernameBlur;
    fullNameBlur.checked = result.fullNameBlur;
    customWordsBlur.checked = result.customWordsBlur;
    customWordsList.value = result.customWordsList;
    
    // Set Instagram mode radio buttons
    usernameBlurMode.checked = !result.usernameReplaceMode;
    usernameReplaceMode.checked = result.usernameReplaceMode;
    fullNameBlurMode.checked = !result.fullNameReplaceMode;
    fullNameReplaceMode.checked = result.fullNameReplaceMode;
    customWordsBlurMode.checked = !result.customWordsReplaceMode;
    customWordsReplaceMode.checked = result.customWordsReplaceMode;

    // Set Twitter mode radio buttons and values
    twitterUsernameBlur.checked = result.twitterUsernameBlur;
    twitterFullNameBlur.checked = result.twitterFullNameBlur;
    twitterUsernameBlurMode.checked = !result.twitterUsernameReplaceMode;
    twitterUsernameReplaceMode.checked = result.twitterUsernameReplaceMode;
    twitterFullNameBlurMode.checked = !result.twitterFullNameReplaceMode;
    twitterFullNameReplaceMode.checked = result.twitterFullNameReplaceMode;
    twitterUsernameReplaceText.value = result.twitterUsernameReplaceText;
    twitterFullNameReplaceText.value = result.twitterFullNameReplaceText;
    
    // Set replacement text values
    usernameReplaceText.value = result.usernameReplaceText;
    fullNameReplaceText.value = result.fullNameReplaceText;
    customWordsReplaceText.value = result.customWordsReplaceText;
    
    // Send initial settings to content script
    updateBlurSettings();
  });

  // Save preferences when changed
  usernameBlur.addEventListener('change', function() {
    chrome.storage.sync.set({ usernameBlur: this.checked });
    updateBlurSettings();
  });

  fullNameBlur.addEventListener('change', function() {
    chrome.storage.sync.set({ fullNameBlur: this.checked });
    updateBlurSettings();
  });
  
  // Mode selection event listeners
  usernameBlurMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ usernameReplaceMode: false });
      updateBlurSettings();
    }
  });
  
  usernameReplaceMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ usernameReplaceMode: true });
      updateBlurSettings();
    }
  });
  
  fullNameBlurMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ fullNameReplaceMode: false });
      updateBlurSettings();
    }
  });
  
  fullNameReplaceMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ fullNameReplaceMode: true });
      updateBlurSettings();
    }
  });
  
  // Replacement text event listeners
  usernameReplaceText.addEventListener('input', function() {
    chrome.storage.sync.set({ usernameReplaceText: this.value });
    updateBlurSettings();
  });
  
  fullNameReplaceText.addEventListener('input', function() {
    chrome.storage.sync.set({ fullNameReplaceText: this.value });
    updateBlurSettings();
  });

  customWordsBlur.addEventListener('change', function() {
    chrome.storage.sync.set({ customWordsBlur: this.checked });
    updateBlurSettings();
  });

  customWordsBlurMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ customWordsReplaceMode: false });
      updateBlurSettings();
    }
  });

  customWordsReplaceMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ customWordsReplaceMode: true });
      updateBlurSettings();
    }
  });

  customWordsReplaceText.addEventListener('input', function() {
    chrome.storage.sync.set({ customWordsReplaceText: this.value });
    updateBlurSettings();
  });

  customWordsList.addEventListener('input', function() {
    chrome.storage.sync.set({ customWordsList: this.value });
    updateBlurSettings();
  });

  // Twitter event listeners
  twitterUsernameBlur.addEventListener('change', function() {
    chrome.storage.sync.set({ twitterUsernameBlur: this.checked });
    updateBlurSettings();
  });

  twitterFullNameBlur.addEventListener('change', function() {
    chrome.storage.sync.set({ twitterFullNameBlur: this.checked });
    updateBlurSettings();
  });

  twitterUsernameBlurMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ twitterUsernameReplaceMode: false });
      updateBlurSettings();
    }
  });

  twitterUsernameReplaceMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ twitterUsernameReplaceMode: true });
      updateBlurSettings();
    }
  });

  twitterFullNameBlurMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ twitterFullNameReplaceMode: false });
      updateBlurSettings();
    }
  });

  twitterFullNameReplaceMode.addEventListener('change', function() {
    if (this.checked) {
      chrome.storage.sync.set({ twitterFullNameReplaceMode: true });
      updateBlurSettings();
    }
  });

  twitterUsernameReplaceText.addEventListener('input', function() {
    chrome.storage.sync.set({ twitterUsernameReplaceText: this.value });
    updateBlurSettings();
  });

  twitterFullNameReplaceText.addEventListener('input', function() {
    chrome.storage.sync.set({ twitterFullNameReplaceText: this.value });
    updateBlurSettings();
  });

  function updateBlurSettings() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const isInstagram = tabs[0].url.includes('instagram.com');
      const isTwitter = tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com');

      if (isInstagram || isTwitter) {
        const settings = isInstagram ? {
          action: 'updateBlurSettings',
          settings: {
            usernameBlur: usernameBlur.checked,
            fullNameBlur: fullNameBlur.checked,
            usernameReplaceMode: usernameReplaceMode.checked,
            fullNameReplaceMode: fullNameReplaceMode.checked,
            usernameReplaceText: usernameReplaceText.value,
            fullNameReplaceText: fullNameReplaceText.value,
            customWordsBlur: customWordsBlur.checked,
            customWordsReplaceMode: customWordsReplaceMode.checked,
            customWordsReplaceText: customWordsReplaceText.value,
            customWordsList: customWordsList.value
          }
        } : {
          action: 'updateBlurSettings',
          settings: {
            usernameBlur: twitterUsernameBlur.checked,
            fullNameBlur: twitterFullNameBlur.checked,
            usernameReplaceMode: twitterUsernameReplaceMode.checked,
            fullNameReplaceMode: twitterFullNameReplaceMode.checked,
            usernameReplaceText: twitterUsernameReplaceText.value,
            fullNameReplaceText: twitterFullNameReplaceText.value,
            customWordsBlur: customWordsBlur.checked,
            customWordsReplaceMode: customWordsReplaceMode.checked,
            customWordsReplaceText: customWordsReplaceText.value,
            customWordsList: customWordsList.value
          }
        };
        chrome.tabs.sendMessage(tabs[0].id, settings);
      }
    });
  }

  function loadProfileInfo() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const isInstagram = tabs[0].url.includes('instagram.com');
      const isTwitter = tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com');
  
      if ((isInstagram && currentPlatform === 'instagram') || (isTwitter && currentPlatform === 'twitter')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getProfileInfo'}, function(response) {
          if (response && response.username && response.fullName) {
            const prefix = currentPlatform === 'twitter' ? 'twitter-' : '';
            document.getElementById(prefix + 'username').textContent = response.username;
            document.getElementById(prefix + 'fullName').textContent = response.fullName;
            document.getElementById('error').style.display = 'none';
          } else {
            document.getElementById('error').style.display = 'block';
            const prefix = currentPlatform === 'twitter' ? 'twitter-' : '';
            document.getElementById(prefix + 'username').textContent = 'Not found';
            document.getElementById(prefix + 'fullName').textContent = 'Not found';
          }
        });
      } else {
        document.getElementById('error').style.display = 'block';
        const prefix = currentPlatform === 'twitter' ? 'twitter-' : '';
        document.getElementById(prefix + 'username').textContent = 'Not available';
        document.getElementById(prefix + 'fullName').textContent = 'Not available';
      }
  
      // Update visibility of platform content
      platformContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${currentPlatform}-tab`) {
          content.classList.add('active');
        }
      });
    });
  }
});