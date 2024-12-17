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
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }

  textNodes.forEach(node => {
    if (node.parentNode && 
        !node.parentNode.classList?.contains('profile-blur')) {
      processTextNode(node, profileInfo);
    }
  });
}

function applyBlurEffect(profileInfo) {
  if (document.body) {
    processNodes(document.body, profileInfo);
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          requestAnimationFrame(() => {
            processNodes(node, profileInfo);
          });
        }
      });
    });
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

function extractTwitterProfileInfo() {
  console.log('Starting Twitter/X profile info extraction from page scripts...');
  
  let profileInfo = null;
  
  // Method 1: Try to extract from global window object
  try {
    console.log('DEBUG: Attempting to extract from global window object...');
    // Twitter often stores user data in global variables
    // Use Function constructor to safely evaluate JavaScript in page context
    const globalCheck = new Function(`
      try {
        // Check for common Twitter data structures
        if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.entities && 
            window.__INITIAL_STATE__.entities.users && 
            window.__INITIAL_STATE__.entities.users.current) {
          return JSON.stringify(window.__INITIAL_STATE__.entities.users.current);
        }
        
        // Check for other common patterns
        if (window.__META_DATA__ && window.__META_DATA__.profile) {
          return JSON.stringify(window.__META_DATA__.profile);
        }
        
        // Look for any global object with user data
        for (const key in window) {
          if (key.includes('state') || key.includes('store') || key.includes('data')) {
            const obj = window[key];
            if (obj && typeof obj === 'object') {
              // Look for user data in this object
              if (obj.user || obj.viewer || obj.session || obj.account) {
                return JSON.stringify(obj);
              }
            }
          }
        }
        
        return null;
      } catch (e) {
        console.error('Error in global check:', e);
        return null;
      }
    `);
    
    const result = globalCheck();
    if (result) {
      console.log('DEBUG: Found data in global window object, parsing...');
      try {
        const data = JSON.parse(result);
        console.log('DEBUG: Parsed global window data:', data);
        
        // Check various patterns for user data
        if (data.screen_name && data.name) {
          profileInfo = {
            username: data.screen_name,
            fullName: data.name
          };
          console.log('Found Twitter profile info in global object:', profileInfo);
          return profileInfo;
        }
        
        if (data.user && data.user.screen_name && data.user.name) {
          profileInfo = {
            username: data.user.screen_name,
            fullName: data.user.name
          };
          console.log('Found Twitter profile info in global user object:', profileInfo);
          return profileInfo;
        }
        
        if (data.username || data.handle) {
          profileInfo = {
            username: data.username || data.handle,
            fullName: data.name || data.displayName || data.username || data.handle
          };
          console.log('Found Twitter profile info in global data:', profileInfo);
          return profileInfo;
        }
      } catch (e) {
        console.log('Error parsing global window data:', e);
      }
    } else {
      console.log('DEBUG: No data found in global window object');
    }
  } catch (e) {
    console.log('Error accessing global window object:', e);
  }
  
  // Method 2: Specifically target script tags with type="text/javascript" containing "needs_phone_verification"
  // This is the most reliable method for Twitter/X as per user requirements
  console.log('Prioritizing search for script tags with type="text/javascript" containing "needs_phone_verification"...');
  const scripts = document.getElementsByTagName('script');
  
  console.log(`DEBUG: Found ${scripts.length} script tags in total`);
  let scriptIndex = 0;
  
  for (const script of scripts) {
    scriptIndex++;
    // Check if script has type="text/javascript" attribute
    const scriptType = script.getAttribute('type');
    console.log(`DEBUG: Script #${scriptIndex} - Type: ${scriptType || 'none'}`);
    
    if (scriptType === 'text/javascript') {
      const content = script.textContent;
      const contentPreview = content ? content.substring(0, 100) + '...' : 'empty';
      console.log(`DEBUG: Script #${scriptIndex} - Content preview: ${contentPreview}`);
      
      // Check if script contains the unique identifier "needs_phone_verification"
      if (content && content.includes('needs_phone_verification')) {
        console.log(`DEBUG: Script #${scriptIndex} - FOUND needs_phone_verification!`);
        try {
          console.log('Found script with needs_phone_verification, extracting profile info...');
          console.log('Looking for exact "name" and "screen_name" keys in the same JSON object...');
          
          // First try to find the exact JSON object containing needs_phone_verification
          // Use a more flexible regex pattern that can handle Twitter's specific JSON structure
          // This pattern looks for JSON-like structures with needs_phone_verification
          const precisePattern = /[{\[](?:.|\r|\n)*?needs_phone_verification(?:.|\r|\n)*?[}\]]/g;
          const preciseMatches = content.match(precisePattern);
          
          console.log('Precise matches found:', preciseMatches ? preciseMatches.length : 0);
          
          if (preciseMatches) {
            console.log('DEBUG: Precise matches content:');
            preciseMatches.forEach((match, idx) => {
              console.log(`DEBUG: Match #${idx} preview: ${match.substring(0, 100)}...`);
            });
            
            for (const match of preciseMatches) {
              try {
                // First try direct regex extraction before attempting JSON parsing
                // This can work even if the JSON is not perfectly parseable
                const nameMatch = match.match(/"name"\s*:\s*"([^"]+)"/i);
                const screenNameMatch = match.match(/"screen_name"\s*:\s*"([^"]+)"/i);
                
                if (nameMatch && nameMatch[1] && screenNameMatch && screenNameMatch[1]) {
                  profileInfo = {
                    fullName: nameMatch[1],
                    username: screenNameMatch[1]
                  };
                  console.log('Found name and screen_name using regex extraction:', profileInfo);
                  return profileInfo;
                }
                
                // Try to parse the JSON object as fallback
                console.log('DEBUG: Attempting to parse JSON match:', match.substring(0, 200) + '...');
                const data = JSON.parse(match);
                console.log('DEBUG: Successfully parsed JSON. Examining potential Twitter profile data object:', JSON.stringify(data));
                
                // Check for exact "name" and "screen_name" keys in the same object as needs_phone_verification
                console.log('DEBUG: Checking for name property:', data.hasOwnProperty('name'));
                console.log('DEBUG: Checking for screen_name property:', data.hasOwnProperty('screen_name'));
                console.log('DEBUG: name value:', data.name);
                console.log('DEBUG: screen_name value:', data.screen_name);
                
                if (data.hasOwnProperty('name') && data.hasOwnProperty('screen_name')) {
                  profileInfo = {
                    fullName: data.name,
                    username: data.screen_name
                  };
                  console.log('Found exact name and screen_name keys in needs_phone_verification object:', profileInfo);
                  return profileInfo;
                }
                
                // Try to find name and screen_name in a nested object
                console.log('DEBUG: Searching for name and screen_name in nested objects...');
                const findUserData = (obj, path = '') => {
                  if (!obj || typeof obj !== 'object') return null;
                  
                  // Check if this object has the required properties
                  if (obj.name && obj.screen_name) {
                    console.log(`DEBUG: Found name and screen_name at path: ${path}`);
                    console.log(`DEBUG: name=${obj.name}, screen_name=${obj.screen_name}`);
                    return {
                      fullName: obj.name,
                      username: obj.screen_name
                    };
                  }
                  
                  // Check nested objects
                  for (const key in obj) {
                    if (obj[key] && typeof obj[key] === 'object') {
                      const result = findUserData(obj[key], `${path}.${key}`);
                      if (result) return result;
                    }
                  }
                  
                  return null;
                };
                
                const nestedData = findUserData(data);
                if (nestedData) {
                  profileInfo = nestedData;
                  console.log('Found Twitter profile info in nested object:', profileInfo);
                  return profileInfo;
                } else {
                  console.log('DEBUG: No nested objects with both name and screen_name found');
                }
              } catch (e) {
                console.log('Error parsing precise JSON match:', e.message);
              }
            }
          } else {
            console.log('DEBUG: No precise matches found with needs_phone_verification');
          }
          
          // If precise matching failed, try with a more general approach
          // Look for any JSON-like structures in the script content
          // This pattern is more flexible and can handle Twitter's specific JSON structure
          const jsonPattern = /[{\[](?:.|\r|\n)*?[}\]]/g;
          const matches = content.match(jsonPattern);
          
          // Also try direct regex extraction from the entire content
          const directNameMatch = content.match(/"name"\s*:\s*"([^"]+)"/i);
          const directScreenNameMatch = content.match(/"screen_name"\s*:\s*"([^"]+)"/i);
          
          if (directNameMatch && directNameMatch[1] && directScreenNameMatch && directScreenNameMatch[1]) {
            profileInfo = {
              fullName: directNameMatch[1],
              username: directScreenNameMatch[1]
            };
            console.log('Found Twitter profile info using direct regex extraction:', profileInfo);
            return profileInfo;
          }
          
          if (matches) {
            console.log('Found general JSON matches:', matches.length);
            console.log('DEBUG: First 5 general matches preview:');
            matches.slice(0, 5).forEach((match, idx) => {
              console.log(`DEBUG: General match #${idx} preview: ${match.substring(0, 100)}...`);
              console.log(`DEBUG: Contains needs_phone_verification: ${match.includes('needs_phone_verification')}`);
              console.log(`DEBUG: Contains name: ${match.includes('name')}`);
              console.log(`DEBUG: Contains screen_name: ${match.includes('screen_name')}`);
            });
            
            // First, prioritize objects that contain both needs_phone_verification, name, and screen_name
            let highPriorityCount = 0;
            for (const match of matches) {
              if (match.includes('needs_phone_verification') && match.includes('name') && match.includes('screen_name')) {
                highPriorityCount++;
                console.log(`DEBUG: High priority match #${highPriorityCount} found with all keywords`);
                console.log(`DEBUG: Match content preview: ${match.substring(0, 150)}...`);
                
                try {
                  const data = JSON.parse(match);
                  console.log('Examining high-priority Twitter data object:', JSON.stringify(data));
                  console.log('DEBUG: Object keys:', Object.keys(data));
                  console.log('DEBUG: name property type:', typeof data.name, 'value:', data.name);
                  console.log('DEBUG: screen_name property type:', typeof data.screen_name, 'value:', data.screen_name);
                  
                  // Direct check for the properties we need
                  if (data.name && data.screen_name) {
                    profileInfo = {
                      fullName: data.name,
                      username: data.screen_name
                    };
                    console.log('Found Twitter profile info with all required properties:', profileInfo);
                    return profileInfo;
                  } else {
                    console.log('DEBUG: Object has name and screen_name keywords but values are not valid');
                  }
                } catch (e) {
                  console.log('Error parsing high-priority match:', e.message);
                }
              }
            }
            
            if (highPriorityCount === 0) {
              console.log('DEBUG: No high priority matches found with all required keywords');
            }
            
            // Then try all matches
            for (const match of matches) {
              try {
                const data = JSON.parse(match);
                
                // Check for name and screen_name in the same JSON object as needs_phone_verification
                if (data.needs_phone_verification !== undefined && data.hasOwnProperty('name') && data.hasOwnProperty('screen_name')) {
                  profileInfo = {
                    fullName: data.name,
                    username: data.screen_name
                  };
                  console.log('Found Twitter profile info in script with needs_phone_verification:', profileInfo);
                  return profileInfo;
                }
                
                // Check for nested user objects that might contain the data
                if (data.user && data.user.hasOwnProperty('name') && data.user.hasOwnProperty('screen_name')) {
                  profileInfo = {
                    fullName: data.user.name,
                    username: data.user.screen_name
                  };
                  console.log('Found Twitter profile info in nested user object:', profileInfo);
                  return profileInfo;
                }
                
                // Deep search for name and screen_name properties
                const findNameAndScreenName = (obj, path = '') => {
                  if (!obj || typeof obj !== 'object') return null;
                  
                  // Check if this object has both name and screen_name
                  if (obj.name && obj.screen_name && typeof obj.name === 'string' && typeof obj.screen_name === 'string') {
                    console.log(`Found name and screen_name at path: ${path}`);
                    return {
                      fullName: obj.name,
                      username: obj.screen_name
                    };
                  }
                  
                  // Check nested objects
                  for (const key in obj) {
                    if (obj[key] && typeof obj[key] === 'object') {
                      // Skip large arrays that are unlikely to contain user data
                      if (Array.isArray(obj[key]) && obj[key].length > 10) continue;
                      
                      const result = findNameAndScreenName(obj[key], `${path}.${key}`);
                      if (result) return result;
                    }
                  }
                  
                  return null;
                };
                
                const deepSearchResult = findNameAndScreenName(data);
                if (deepSearchResult) {
                  profileInfo = deepSearchResult;
                  console.log('Found Twitter profile info through deep search:', profileInfo);
                  return profileInfo;
                }
              } catch (e) {
                // Silent catch for invalid JSON
              }
            }
          }
        } catch (e) {
          console.log('Error processing Twitter script content:', e);
        }
      }
    }
  }
  
  // Fallback: Try to extract from the page source using a more robust pattern
  try {
    console.log('Attempting to extract Twitter profile from page source with improved pattern...');
    const pageSource = document.documentElement.outerHTML;
    
    // Look for JSON objects that might contain user data with a more robust pattern
    // This pattern can find objects with both name and screen_name properties
    // Try both ordering possibilities: name first or screen_name first
    const userDataPattern1 = /\{[^\{\}]*"screen_name"\s*:\s*"([^"]+)"[^\{\}]*"name"\s*:\s*"([^"]+)"[^\{\}]*\}/g;
    const userDataPattern2 = /\{[^\{\}]*"name"\s*:\s*"([^"]+)"[^\{\}]*"screen_name"\s*:\s*"([^"]+)"[^\{\}]*\}/g;
    
    const matches1 = pageSource.match(userDataPattern1) || [];
    const matches2 = pageSource.match(userDataPattern2) || [];
    const matches = [...matches1, ...matches2];
    
    if (matches && matches.length > 0) {
      console.log('Found potential Twitter user data matches in page source:', matches.length);
      
      for (const match of matches) {
        // Extract the screen_name and name directly using regex
        const screenNameMatch = match.match(/"screen_name"\s*:\s*"([^"]+)"/i);
        const nameMatch = match.match(/"name"\s*:\s*"([^"]+)"/i);
        
        if (screenNameMatch && screenNameMatch[1] && nameMatch && nameMatch[1]) {
          profileInfo = {
            username: screenNameMatch[1],
            fullName: nameMatch[1]
          };
          console.log('Extracted Twitter profile info from page source:', profileInfo);
          return profileInfo;
        }
      }
    }
    
    // If no matches found with the above patterns, try a proximity-based approach
    // Find all name and screen_name values in the page source
    const allNameMatches = Array.from(pageSource.matchAll(/"name"\s*:\s*"([^"]+)"/gi));
    const allScreenNameMatches = Array.from(pageSource.matchAll(/"screen_name"\s*:\s*"([^"]+)"/gi));
    
    if (allNameMatches.length > 0 && allScreenNameMatches.length > 0) {
      console.log(`Found ${allNameMatches.length} name matches and ${allScreenNameMatches.length} screen_name matches`);
      
      // Find the closest pair of name and screen_name values
      let closestPair = null;
      let minDistance = Infinity;
      
      for (const nameMatch of allNameMatches) {
        for (const screenNameMatch of allScreenNameMatches) {
          const distance = Math.abs(nameMatch.index - screenNameMatch.index);
          if (distance < minDistance && distance < 500) { // Only consider pairs within 500 characters
            minDistance = distance;
            closestPair = {
              fullName: nameMatch[1],
              username: screenNameMatch[1]
            };
          }
        }
      }
      
      if (closestPair) {
        profileInfo = closestPair;
        console.log('Found Twitter profile info using proximity matching:', profileInfo);
        return profileInfo;
      }
    }
  } catch (e) {
    console.log('Error extracting Twitter profile from page source:', e);
  }
  
  // Fallback: Try to find user data in any script tags
  for (const script of scripts) {
    const content = script.textContent;
    
    // Check if script contains screen_name and name
    if (content && content.includes('screen_name') && content.includes('name')) {
      try {
        console.log('Found script with screen_name and name, attempting to extract...');
        
        // First try to find JSON objects containing both screen_name and name
        const jsonPattern = /\{(?:[^{}]|\{[^{}]*\})*\}/g;
        const matches = content.match(jsonPattern);
        
        if (matches) {
          for (const match of matches) {
            try {
              const data = JSON.parse(match);
              
              // Check for Twitter user data patterns
              if (data.hasOwnProperty('screen_name') && data.hasOwnProperty('name')) {
                profileInfo = {
                  fullName: data.name,
                  username: data.screen_name
                };
                console.log('Found Twitter profile info in script JSON:', profileInfo);
                return profileInfo;
              }
              
              // Check for nested structures that might contain the user data
              // Look for common patterns in Twitter's data structure
              const checkNestedObject = (obj, path = '') => {
                if (!obj || typeof obj !== 'object') return null;
                
                // Direct check for screen_name and name properties
                if (obj.hasOwnProperty('screen_name') && obj.hasOwnProperty('name')) {
                  console.log(`Found user data at path: ${path}`);
                  return {
                    username: obj.screen_name,
                    fullName: obj.name
                  };
                }
                
                // Check nested objects
                for (const key in obj) {
                  if (obj[key] && typeof obj[key] === 'object') {
                    // Skip arrays that are likely not user data
                    if (Array.isArray(obj[key]) && obj[key].length > 5) continue;
                    
                    const result = checkNestedObject(obj[key], `${path}.${key}`);
                    if (result) return result;
                  }
                }
                
                return null;
              };
              
              const nestedResult = checkNestedObject(data);
              if (nestedResult) {
                profileInfo = nestedResult;
                console.log('Found Twitter profile info in nested object:', profileInfo);
                return profileInfo;
              }
            } catch (e) {
              // Silent catch for invalid JSON
            }
          }
        }
      } catch (e) {
        console.log('Error processing Twitter script content:', e);
      }
    }
  }
  
  // Method 3: Try to extract from meta tags
  try {
    // Twitter often includes user info in meta tags
    const metaTags = document.querySelectorAll('meta[content][name], meta[content][property]');
    let twitterHandle = null;
    let twitterName = null;
    
    for (const tag of metaTags) {
      const name = tag.getAttribute('name') || tag.getAttribute('property') || '';
      const content = tag.getAttribute('content') || '';
      
      if (name.includes('twitter:creator') || name.includes('twitter:site')) {
        if (content.startsWith('@')) {
          twitterHandle = content.substring(1); // Remove @ symbol
        } else {
          twitterHandle = content;
        }
      }
      
      if (name.includes('twitter:title') || name.includes('og:title')) {
        twitterName = content;
        // Clean up title if it contains "on Twitter" or similar
        if (twitterName.includes(' on Twitter') || twitterName.includes(' on X')) {
          twitterName = twitterName.replace(/ on (Twitter|X).*$/, '');
        }
      }
    }
    
    if (twitterHandle && twitterName) {
      profileInfo = {
        username: twitterHandle,
        fullName: twitterName
      };
      console.log('Found Twitter profile info from meta tags:', profileInfo);
      return profileInfo;
    }
  } catch (e) {
    console.log('Error extracting Twitter profile from meta tags:', e);
  }
  
  // Method 4: Try to extract from DOM elements
  try {
    // Look for nav elements that might contain user info
    const navItems = document.querySelectorAll('[data-testid="AppTabBar_Profile_Link"], [aria-label*="profile"], [href*="/home"]');
    
    for (const item of navItems) {
      const href = item.getAttribute('href');
      if (href && href.startsWith('/')) {
        const username = href.split('/').filter(Boolean)[0];


        if (username && username !== 'home' && username !== 'explore' && username !== 'notifications') {
          // Try to find the display name, but avoid elements that just contain the word "Profile"
          const nameElements = document.querySelectorAll(`[href="/${username}"] div, [href="/${username}"] span`);
          let fullName = username; // Default fallback
          
          // Filter out elements that just contain "Profile" text
          for (const element of nameElements) {
            const text = element.textContent.trim();
            if (text && text !== 'Profile' && text !== username) {
              fullName = text;
              break;
            }
          }
          
          profileInfo = {
            username: username,
            fullName: fullName
          };
          console.log('Found Twitter profile info from DOM navigation:', profileInfo);
          return profileInfo;
        }
      }
    }
    
    // Try to find profile link in the sidebar
    const profileLinks = document.querySelectorAll('a[href^="/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('/') && href.length > 1) {
        const username = href.substring(1);
        if (username && !['home', 'explore', 'notifications', 'messages', 'bookmarks'].includes(username)) {
          profileInfo = {
            username: username,
            fullName: username // Use username as fallback
          };
          console.log('Found Twitter username from profile link:', profileInfo);
          return profileInfo;
        }
      }
    }
    
    // Look for profile image which might contain username in alt text or aria-label
    const profileImages = document.querySelectorAll('img[alt*="profile"], [aria-label*="profile"]');
    for (const img of profileImages) {
      const altText = img.getAttribute('alt') || img.getAttribute('aria-label') || '';
      
      // Skip if the alt text is just "Profile" or similar generic text
      if (altText === 'Profile' || altText === 'profile' || altText === 'Profile image') {
        continue;
      }
      
      // Look for username patterns in the alt text
      const matches = altText.match(/(@\w+)|([\w]+)'s profile/i);
      if (matches && matches[1]) {
        const username = matches[1].startsWith('@') ? matches[1].substring(1) : matches[1];
        
        // Try to find a better name than just the username
        let fullName = username;
        
        // Look for a name in nearby elements
        const parentElement = img.parentElement;
        if (parentElement) {
          const nameElements = parentElement.querySelectorAll('div, span');
          for (const element of nameElements) {
            const text = element.textContent.trim();
            if (text && text !== 'Profile' && text !== username) {
              fullName = text;
              break;
            }
          }
        }
        
        profileInfo = {
          username: username,
          fullName: fullName
        };
        console.log('Found Twitter username from profile image:', profileInfo);
        return profileInfo;
      }
    }
  } catch (e) {
    console.log('Error extracting Twitter profile from DOM:', e);
  }
  
  console.log('Could not find Twitter profile info in any script, meta tags, or DOM elements');
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

// Run immediately when script loads
const profileInfo = extractProfileInfo();
if (profileInfo) {
  currentProfileInfo = profileInfo;
  applyBlurEffect(profileInfo);
}

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
      // Re-apply blur with new settings
      document.querySelectorAll('.profile-blur, .profile-replaced').forEach(el => {
        const text = el.classList.contains('profile-replaced') ? el.dataset.originalText : el.textContent;
        el.parentNode.replaceChild(document.createTextNode(text), el);
      });
      applyBlurEffect(currentProfileInfo);
    }
  } else if (request.action === 'getProfileInfo') {
    const profileInfo = extractProfileInfo();
    if (profileInfo) {
      currentProfileInfo = profileInfo;
      applyBlurEffect(profileInfo);
    }
    sendResponse(profileInfo);
  }
});