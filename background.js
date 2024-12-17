chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProfileInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getProfileInfo' }, (response) => {
        sendResponse(response);
      });
    });
    return true; // Required to use sendResponse asynchronously
  }
});