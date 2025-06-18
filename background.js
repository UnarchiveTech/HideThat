// Create the context menu item on installation.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToMaskIt",
    title: "Add \"%s\" to MaskIt", // %s is a placeholder for the selected text
    contexts: ["selection"]
  });
});

const defaultSettings = {
  settings: {
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
      usernameBlur: false,
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
  }
};

// Handle the context menu click event.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToMaskIt" && info.selectionText) {
    const newWord = info.selectionText.trim();
    if (newWord) {
      // Get the current settings.
      chrome.storage.sync.get(defaultSettings, (data) => {
        let settings = data.settings;
        let customWordsList = settings.global.customWordsList ? settings.global.customWordsList.split(',').map(w => w.trim()).filter(w => w) : [];

        // Add the new word if it's not already in the list.
        if (!customWordsList.includes(newWord)) {
          customWordsList.push(newWord);
          settings.global.customWordsList = customWordsList.join(',');
          
          // Save the updated settings.
          chrome.storage.sync.set({ settings }, () => {
            // Determine which platform settings to send
            let platform = 'instagram'; // Default
            if (tab.url.includes('twitter.com') || tab.url.includes('x.com')) platform = 'twitter';
            if (tab.url.includes('linkedin.com')) platform = 'linkedin';
            
            // Notify the content script in the active tab to update.
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateBlurSettings',
                settings: {
                    ...settings[platform],
                    ...settings.global,
                }
            }, () => {
              if (chrome.runtime.lastError) {
                // This just means the content script wasn't ready, which is fine.
              }
            });
          });
        }
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProfileInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getProfileInfo' }, (response) => {
        if (chrome.runtime.lastError) {
          // Handle error if the content script is not available
          sendResponse(null);
          return;
        }
        sendResponse(response);
      });
    });
    return true; // Required to use sendResponse asynchronously
  } else if (request.action === 'settingsUpdated') {
    // When settings change in the popup, re-evaluate the icon for the active tab.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id && tabs[0].url) {
        updateIcon(tabs[0].id, tabs[0].url);
      }
    });
    // No async response needed.
  }
});

// Listener for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  // Check which command was triggered
  if (command === "hide-current-profile") {
    console.log('"hide-current-profile" command triggered.');
    
    // Find the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Ensure there is an active tab and it has an ID
      if (tabs[0] && tabs[0].id) {
        // Send a message to the content script in the active tab, telling it to "update".
        // This triggers the same refresh logic as the "Force Re-scan Page" button.
        chrome.tabs.sendMessage(tabs[0].id, { action: "update" }, () => {
          if (chrome.runtime.lastError) {
            // This error is expected if the content script is not injected on the current page
            // (e.g., chrome://extensions). We can safely ignore it.
            console.log('Could not send "update" message, likely on an unsupported page.');
          }
        });
      }
    });
  } else if (command === "toggle-masking") {
    console.log('"toggle-masking" command triggered.');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url) return;

      let platform = null;
      try {
        const hostname = new URL(tab.url).hostname;
        if (hostname.includes('instagram.com')) platform = 'instagram';
        else if (hostname.includes('twitter.com') || hostname.includes('x.com')) platform = 'twitter';
        else if (hostname.includes('linkedin.com')) platform = 'linkedin';
      } catch (e) {
        return; // Not a valid URL, do nothing
      }
      
      if (!platform) {
        console.log('Toggle masking ignored: not on a supported platform.');
        return; // Not a supported platform
      }
      
      // Get current settings
      chrome.storage.sync.get(defaultSettings, (data) => {
        if (chrome.runtime.lastError) { return; }
        
        let settings = data.settings;
        const platformSettings = settings[platform];
        
        // Determine the new state. If any masking is on, turn it all off. Otherwise, turn it on.
        const isCurrentlyActive = platformSettings.usernameBlur || platformSettings.fullNameBlur;
        const newState = !isCurrentlyActive; // true for ON, false for OFF
        
        console.log(`Toggling masking for ${platform} to: ${newState ? 'ON' : 'OFF'}`);
        
        if (platform === 'linkedin') {
          settings.linkedin.fullNameBlur = newState;
        } else { // Instagram & Twitter
          settings[platform].usernameBlur = newState;
          settings[platform].fullNameBlur = newState;
        }

        // Save the updated settings
        chrome.storage.sync.set({ settings }, () => {
          // 1. Notify the content script to update the view
          const payload = {
            action: 'updateBlurSettings',
            settings: {
              ...settings[platform],
              ...settings.global // must include global settings
            }
          };
          chrome.tabs.sendMessage(tab.id, payload, () => {
            if (chrome.runtime.lastError) {
              console.log('Could not send "updateBlurSettings" message, content script might not be ready.');
            }
          });
          
          // 2. Update the icon
          updateIcon(tab.id, tab.url);
        });
      });
    });
  }
});

function updateIcon(tabId, url) {
  let platform = null;
  if (url) {
      try {
        const hostname = new URL(url).hostname;
        if (hostname.includes('instagram.com')) platform = 'instagram';
        else if (hostname.includes('twitter.com') || hostname.includes('x.com')) platform = 'twitter';
        else if (hostname.includes('linkedin.com')) platform = 'linkedin';
      } catch (e) {
        platform = null; // Invalid URL
      }
  }

  if (!platform) {
    try {
      chrome.action.setIcon({ path: { "128": "icons/inactive.png" }, tabId: tabId });
    } catch (e) { /* Tab might be closed */ }
    return;
  }

  // Get settings to determine if any feature is active for the current platform
  chrome.storage.sync.get(defaultSettings, (data) => {
    if (chrome.runtime.lastError) { return; }
    const settings = data.settings;
    const platformSettings = settings[platform];
    const globalSettings = settings.global;
    
    let isActive = false;
    
    // Check platform-specific settings that are enabled
    if (platform === 'linkedin') {
      if (platformSettings.fullNameBlur) isActive = true;
    } else { // Instagram & Twitter/X
      if (platformSettings.usernameBlur || platformSettings.fullNameBlur) {
        isActive = true;
      }
    }
    
    // Check global settings if not already deemed active
    if (!isActive && globalSettings.customWordsBlur && globalSettings.customWordsList && globalSettings.customWordsList.trim() !== '') {
      isActive = true;
    }

    const iconPath = isActive ? 'icons/active.png' : 'icons/inactive.png';
    
    try {
      chrome.action.setIcon({
        path: { "128": iconPath },
        tabId: tabId
      });
    } catch (e) { /* Tab might be closed */ }
  });
}

// --- ICON MANAGEMENT ---

// Listener for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the URL has changed
  if (changeInfo.url) {
    updateIcon(tabId, changeInfo.url);
  }
});

// Listener for when the active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      // Tab might not exist, e.g., if it was just closed.
      return;
    }
    updateIcon(activeInfo.tabId, tab.url);
  });
});

// Set initial icon for all existing tabs when the extension starts
chrome.windows.getAll({ populate: true }, (windows) => {
  for (const window of windows) {
    for (const tab of window.tabs) {
      updateIcon(tab.id, tab.url);
    }
  }
});