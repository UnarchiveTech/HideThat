function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

let currentProfileInfo = null;

let blurSettings = {
  usernameBlur: true,
  fullNameBlur: true,
  customWordsBlur: true,
  usernameReplaceMode: false,
  fullNameReplaceMode: false,
  customWordsReplaceMode: false,
  usernameReplaceText: "[username]",
  fullNameReplaceText: "[name]",
  customWordsReplaceText: "[hidden]",
  customWordsList: ""
};

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

// Load settings from storage when the script starts
chrome.storage.sync.get(defaultSettings, (result) => {
  const currentUrl = window.location.href;
  
  let platform = 'instagram'; // Default
  if (currentUrl.includes('twitter.com') || currentUrl.includes('x.com')) platform = 'twitter';
  if (currentUrl.includes('linkedin.com')) platform = 'linkedin';

  const platformSettings = result.settings[platform];

  // Combine platform-specific and global settings
  blurSettings = { ...platformSettings, ...result.settings.global };

  // Initial run after loading settings
  const profileInfo = extractProfileInfo();
  if (profileInfo) {
    currentProfileInfo = profileInfo;
    applyBlurEffect(profileInfo);
  }
});

function processTextNode(textNode, profileInfo) {
  if (!profileInfo) return;
  
  // Create mapping for username, fullName and custom words replacements
  const replacements = {};
  
  // Add custom words to replacements if enabled
  if (blurSettings.customWordsBlur && blurSettings.customWordsList) {
    const customWords = blurSettings.customWordsList.split(',').map(word => word.trim()).filter(word => word);
    customWords.forEach(word => {
      replacements[word] = {
        shouldProcess: true,
        replaceMode: blurSettings.customWordsReplaceMode,
        replaceText: blurSettings.customWordsReplaceText
      };
    });
  }
  
  if (profileInfo.username) {
    if (blurSettings.usernameBlur) {
      replacements[profileInfo.username] = {
        shouldProcess: true,
        replaceMode: blurSettings.usernameReplaceMode,
        replaceText: blurSettings.usernameReplaceText
      };
    }
  }
  
  if (profileInfo.fullName) {
    if (blurSettings.fullNameBlur) {
      replacements[profileInfo.fullName] = {
        shouldProcess: true,
        replaceMode: blurSettings.fullNameReplaceMode,
        replaceText: blurSettings.fullNameReplaceText
      };
    }
  }
  
  const patterns = Object.keys(replacements).filter(key => replacements[key].shouldProcess);
  if (patterns.length === 0) return;
  
  const metaRegex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i');
  const text = textNode.textContent;
  
  if (!metaRegex.test(text)) return;
  
  const segments = text.split(metaRegex);
  const container = document.createElement('span');
  
  segments.forEach(segment => {
    if (metaRegex.test(segment)) {
      // Find which pattern matched
      const matchedPattern = patterns.find(pattern => 
        new RegExp(`\\b${pattern}\\b`, 'i').test(segment));
      
      const config = replacements[matchedPattern];
      
      if (config.replaceMode) {
        // Replace text mode
        const replaceSpan = document.createElement('span');
        replaceSpan.textContent = config.replaceText;
        replaceSpan.dataset.originalText = segment;
        replaceSpan.classList.add('profile-replaced');
        container.appendChild(replaceSpan);
      } else {
        // Blur mode
        const blurSpan = document.createElement('span');
        blurSpan.textContent = segment;
        blurSpan.classList.add('profile-blur');
        container.appendChild(blurSpan);
      }
    } else if (segment) {
      container.appendChild(document.createTextNode(segment));
    }
  });
  
  textNode.parentNode.replaceChild(container, textNode);
}

function processNodes(root, profileInfo) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Reject nodes inside our own generated elements, or inside scripts/styles.
        if (node.parentElement.closest('.profile-blur, .profile-replaced, script, style')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  // Collect nodes first to avoid issues with modifying the DOM while iterating.
  const nodesToProcess = [];
  while(walker.nextNode()) {
    nodesToProcess.push(walker.currentNode);
  }

  // Now, process the collected nodes.
  nodesToProcess.forEach(node => {
      processTextNode(node, profileInfo);
  });
}

function applyBlurEffect(profileInfo) {
  if (document.body) {
    processNodes(document.body, profileInfo);
  }

  // Debounce the processing to avoid performance issues on rapid DOM changes
  const debouncedProcessNodes = debounce(() => {
    // Re-process the entire body. This is simpler and safer than trying to
    // process only added nodes, and with debouncing it's efficient enough.
    processNodes(document.body, profileInfo);
  }, 150); // Wait 150ms after the last change

  const observer = new MutationObserver(() => {
    // Any change triggers a debounced full reprocessing.
    debouncedProcessNodes();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function extractInstagramProfileInfo() {
  console.log('Starting Instagram profile info extraction from page scripts...');
  
  let profileInfo = null;
  
  // Get all script tags in the document
  const scripts = document.getElementsByTagName('script');
  
  // Iterate through each script tag
  for (const script of scripts) {
    const content = script.textContent;
    
    // Look for script containing has_phone_number
    if (content && content.includes('has_phone_number')) {
      try {
        // Find JSON-like objects in the script content
        const matches = content.match(/\{[^\{\}]*has_phone_number[^\{\}]*\}/g);
        
        if (matches) {
          for (const match of matches) {
            try {
              const data = JSON.parse(match);
              
              // Check if this object has the properties we need
              if (data.username && data.full_name) {
                profileInfo = {
                  username: data.username,
                  fullName: data.full_name
                };
                console.log('Found Instagram profile info in script JSON:', profileInfo);
                return profileInfo;
              }
            } catch (e) {
              console.log('Error parsing potential JSON object:', e);
            }
          }
        }
      } catch (e) {
        console.log('Error processing script content:', e);
      }
    }
  }
  
  // Fallback to searching in the entire page source
  const pageSource = document.documentElement.outerHTML;
  const jsonMatch = pageSource.match(/\{[^\{\}]*has_phone_number[^\{\}]*\}/g);
  
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      if (data.username && data.full_name) {
        profileInfo = {
          username: data.username,
          fullName: data.full_name
        };
        console.log('Found Instagram profile info in page source:', profileInfo);
        return profileInfo;
      }
    } catch (e) {
      console.log('Error parsing JSON from page source:', e);
    }
  }
  
  console.log('Could not find Instagram profile info in any script or page source');
  return null;
}

// --- Twitter/X Profile Extraction (Refactored) ---
  
function _twitter_extractFromWindow() {
  // Method 1: Try to extract from global window object
  try {
    const globalCheck = new Function(`
      try {
        if (window.__INITIAL_STATE__?.entities?.users?.current) {
          return JSON.stringify(window.__INITIAL_STATE__.entities.users.current);
        }
        if (window.__META_DATA__?.profile) {
          return JSON.stringify(window.__META_DATA__.profile);
        }
        return null;
      } catch (e) { return null; }
    `);
    
    const result = globalCheck();
    if (result) {
        const data = JSON.parse(result);
        if (data.screen_name && data.name) {
        return { username: data.screen_name, fullName: data.name };
      }
    }
  } catch (e) {
    console.log('Error accessing global window object for Twitter info:', e);
  }
  return null;
  }
  
function _twitter_extractFromScriptTags() {
  // Method 2: Target script tags with specific identifiers
  const scripts = document.getElementsByTagName('script');
  for (const script of scripts) {
      const content = script.textContent;
    if (content && content.includes('needs_phone_verification')) {
      // Prioritize precise regex for the object containing the verification flag
      const precisePattern = /\{[^{}]*?"screen_name"\s*:\s*"[^"]+"[^{}]*?"name"\s*:\s*"[^"]+"[^{}]*?needs_phone_verification[^{}]*\}/;
      let match = content.match(precisePattern);

      if (match) {
        try {
          const screenNameMatch = match[0].match(/"screen_name"\s*:\s*"([^"]+)"/i);
          const nameMatch = match[0].match(/"name"\s*:\s*"([^"]+)"/i);
          if (nameMatch && screenNameMatch) {
            return { fullName: nameMatch[1], username: screenNameMatch[1] };
          }
        } catch(e) { /* Fallback to general search */ }
      }

      // Fallback: More general regex if the precise one fails
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/i);
      const screenNameMatch = content.match(/"screen_name"\s*:\s*"([^"]+)"/i);
      if (nameMatch && nameMatch[1] && screenNameMatch && screenNameMatch[1]) {
        return { fullName: nameMatch[1], username: screenNameMatch[1] };
      }
    }
  }
  return null;
}

function _twitter_extractFromSourceRegex() {
    // Method 3: Fallback to regex on the entire page source
    try {
    const pageSource = document.documentElement.outerHTML;
        const userDataPattern = /\{[^{}]*"screen_name"\s*:\s*"([^"]+)"[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*\}/g;
        const matches = pageSource.match(userDataPattern);
    
    if (matches && matches.length > 0) {
            const screenNameMatch = matches[0].match(/"screen_name"\s*:\s*"([^"]+)"/i);
            const nameMatch = matches[0].match(/"name"\s*:\s*"([^"]+)"/i);
            if (screenNameMatch && nameMatch) {
                return { username: screenNameMatch[1], fullName: nameMatch[1] };
          }
        }
      } catch (e) {
        console.log('Error extracting Twitter profile from page source via Regex:', e);
    }
    return null;
  }
  
function _twitter_extractFromMetaTags() {
  // Method 4: Try to extract from meta tags
  try {
    const metaTags = document.querySelectorAll('meta[content][name], meta[content][property]');
    let twitterHandle = null;
    let twitterName = null;
    
    for (const tag of metaTags) {
      const name = tag.getAttribute('name') || tag.getAttribute('property') || '';
      const content = tag.getAttribute('content') || '';
      
      if (name.includes('twitter:creator') || name.includes('twitter:site')) {
        twitterHandle = content.startsWith('@') ? content.substring(1) : content;
      }
      if (name.includes('og:title')) {
        // Example: "Elon Musk (@elonmusk) on X"
        const match = content.match(/(.*)\s\(@(\w+)\)/);
        if (match && match[1] && match[2]) {
            return { fullName: match[1], username: match[2] };
        }
      }
    }
    
    if (twitterHandle && twitterName) {
      return { username: twitterHandle, fullName: twitterName };
    }
  } catch (e) {
    console.log('Error extracting Twitter profile from meta tags:', e);
  }
  return null;
}

function _twitter_extractFromDOM() {
    // Method 5: Last resort, inspect DOM elements
    try {
        // Look for profile link in the main navigation
        const profileLink = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
        if (profileLink) {
            const href = profileLink.getAttribute('href');
            const username = href ? href.substring(1) : null;
            if (username) {
                // The name is often in a nested span
                const nameElement = profileLink.querySelector('div > div > span');
                const fullName = nameElement ? nameElement.textContent.trim() : username;
                return { username, fullName };
            }
        }
    } catch(e) {
        console.log('Error extracting Twitter profile from DOM:', e);
    }
    return null;
}

function extractTwitterProfileInfo() {
  console.log('Starting Twitter/X profile info extraction...');
  
  const extractionMethods = [
    _twitter_extractFromWindow,
    _twitter_extractFromScriptTags,
    _twitter_extractFromSourceRegex,
    _twitter_extractFromMetaTags,
    _twitter_extractFromDOM
  ];

  for (const method of extractionMethods) {
    const profileInfo = method();
    if (profileInfo) {
      console.log(`Found Twitter profile info using: ${method.name}`, profileInfo);
          return profileInfo;
    }
  }
  
  console.log('Could not find Twitter profile info using any method.');
  return null;
}

function extractLinkedInProfileInfo() {
  console.log('Starting LinkedIn profile info extraction...');
  // For LinkedIn, we primarily care about the full name.
  // The concept of a "username" isn't as central.
  
  let fullName = null;

  // Strategy 1: Look for the main profile name element with profile-card-name class
  const nameElement = document.querySelector('.profile-card-name');
  if (nameElement && nameElement.textContent.trim()) {
    fullName = nameElement.textContent.trim();
  }

  // Strategy 2: Look for the main profile name element, which is usually an h1 within the profile top card.
  if (!fullName) {
    const topCard = document.querySelector('.pv-top-card, #profile-content, .scaffold-layout__main'); // Common parent elements for profile
    if (topCard) {
      const nameElement = topCard.querySelector('h1');
      if (nameElement && nameElement.textContent.trim()) {
        fullName = nameElement.textContent.trim();
      }
    }
  }

  // Strategy 3: Extract from the page title as a strong fallback.
  // Titles are often "Full Name | LinkedIn"
  if (!fullName) {
      const title = document.title;
      if (title.includes('| LinkedIn')) {
          fullName = title.split('|')[0].trim();
      }
  }

  // Strategy 4: Look for the name in the meta property for profile name
  if (!fullName) {
    const metaNameElement = document.querySelector('meta[property="profile:name"]');
    if (metaNameElement && metaNameElement.content) {
        fullName = metaNameElement.content.trim();
    }
  }

  // Strategy 5: Look for profile picture alt text
  if (!fullName) {
      const profilePic = document.querySelector('.pv-top-card-profile-picture__image, .ivm-view-attr__img--centered');
      if (profilePic && profilePic.alt) {
          // Alt text is often "View ...'s profile" or just "Full Name"
          fullName = profilePic.alt.replace(/View|'s profile/gi, '').trim();
      }
  }

  if (fullName) {
    console.log('Found LinkedIn profile info:', fullName);
    return { fullName: fullName, username: fullName }; // Use fullName for both username and fullName
  }

  console.log('Could not find LinkedIn profile info.');
  return null;
}

function extractProfileInfo() {
  console.log('Starting profile info extraction...');
  
  const currentUrl = window.location.href;
  let profileInfo = null;
  
  if (currentUrl.includes('instagram.com')) {
    profileInfo = extractInstagramProfileInfo();
  } else if (currentUrl.includes('twitter.com') || currentUrl.includes('x.com')) {
    profileInfo = extractTwitterProfileInfo();
  } else if (currentUrl.includes('linkedin.com')) {
    profileInfo = extractLinkedInProfileInfo();
  }
  
  if (profileInfo) {
    currentProfileInfo = profileInfo;
    applyBlurEffect(profileInfo);
  }
  
  return profileInfo;
}

// Add style element to the document
const style = document.createElement('style');
style.textContent = `
.profile-blur {
  filter: blur(5px);
  user-select: none;
  display: inline-block;
  color: inherit;
  background: inherit;
  transform: translateZ(0);
  will-change: filter;
  padding: 0 2px;
  margin: 0 -2px;
  border-radius: 2px;
  transition: filter 0.2s ease-out;
  cursor: pointer;
}

.profile-blur:hover {
  filter: blur(0);
  transition: filter 0.15s ease-in;
}
`;
document.head.appendChild(style);

// Run immediately when script loads - MOVED inside storage.sync.get callback
/*
const profileInfo = extractProfileInfo();
if (profileInfo) {
  currentProfileInfo = profileInfo;
  applyBlurEffect(profileInfo);
}
*/

// Also run on DOMContentLoaded as backup
document.addEventListener('DOMContentLoaded', () => {
  if (!currentProfileInfo) {
    const profileInfo = extractProfileInfo();
    if (profileInfo) {
      currentProfileInfo = profileInfo;
      applyBlurEffect(profileInfo);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBlurSettings') {
    blurSettings = request.settings;
    if (currentProfileInfo) {
      // Revert all existing blurred/replaced elements first
      document.querySelectorAll('.profile-blur, .profile-replaced').forEach(el => {
        const text = el.classList.contains('profile-replaced') ? el.dataset.originalText : el.textContent;
        if (el.parentNode) {
        el.parentNode.replaceChild(document.createTextNode(text), el);
        }
      });
      // Now, re-apply the effect with the new settings
      applyBlurEffect(currentProfileInfo);
    }
  } else if (request.action === 'getProfileInfo') {
    // Make sure settings are loaded before trying to apply blur
    if (Object.keys(blurSettings).length === 0) {
        chrome.storage.sync.get(defaultSettings, (result) => {
        const currentUrl = window.location.href;
        
        let platform = 'instagram'; // Default
        if (currentUrl.includes('twitter.com') || currentUrl.includes('x.com')) platform = 'twitter';
        if (currentUrl.includes('linkedin.com')) platform = 'linkedin';

        const platformSettings = result.settings[platform];
        blurSettings = { ...platformSettings, ...result.settings.global };

        const profileInfo = extractProfileInfo();
        if (profileInfo) {
            currentProfileInfo = profileInfo;
            applyBlurEffect(profileInfo);
        }
        sendResponse(profileInfo);
        });
        return true; // Keep the message channel open for async response
    } else {
    const profileInfo = extractProfileInfo();
    if (profileInfo) {
      currentProfileInfo = profileInfo;
      applyBlurEffect(profileInfo);
    }
    sendResponse(profileInfo);
    }
  } else if (request.action === 'update') {
    // This action is triggered by the keyboard shortcut or a manual refresh button.
    // It's crucial for re-applying settings on dynamic pages.

    // First, revert all existing masked elements to their original text.
    // This prevents nesting spans and ensures a clean slate.
    document.querySelectorAll('.profile-blur, .profile-replaced').forEach(el => {
      const text = el.classList.contains('profile-replaced') ? el.dataset.originalText : el.textContent;
      if (el.parentNode) {
        el.parentNode.replaceChild(document.createTextNode(text), el);
      }
    });

    // Then, re-run the full extraction and application process.
    const profileInfo = extractProfileInfo();
    if (profileInfo) {
      currentProfileInfo = profileInfo;
      applyBlurEffect(profileInfo);
    }
    
    // Send a response to confirm the update has been processed.
    sendResponse({status: 'complete'});
  }
});