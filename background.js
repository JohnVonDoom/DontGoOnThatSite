// Object to store active timers
let timers = {};

// Initialize storage when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ timeLimits: {} });
  chrome.storage.local.set({ blockedSites: {} });
});

// Listen for tab updates to start timers when a page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const hostname = new URL(tab.url).hostname;
    chrome.storage.sync.get('timeLimits', (data) => {
      const timeLimits = data.timeLimits || {};
      if (timeLimits[hostname]) {
        startTimer(hostname, tabId);
      }
    });
    
    // Check if the site is blocked
    chrome.storage.local.get('blockedSites', (data) => {
      const blockedSites = data.blockedSites || {};
      if (blockedSites[hostname] && blockedSites[hostname] > Date.now()) {
        chrome.tabs.update(tabId, { url: "https://www.microsoft.com" });
      }
    });
  }
});

// Function to start a timer for a specific hostname
function startTimer(hostname, tabId) {
  if (!timers[hostname]) {
    timers[hostname] = { startTime: Date.now(), tabId: tabId };
    chrome.alarms.create(hostname, { delayInMinutes: 1 });
  }
}

// Function to calculate time remaining until midnight
function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

// Listen for alarms to check if time limits have been reached
chrome.alarms.onAlarm.addListener((alarm) => {
  const hostname = alarm.name;
  if (timers[hostname]) {
    const elapsedTime = (Date.now() - timers[hostname].startTime) / 60000; // Convert to minutes
    chrome.storage.sync.get('timeLimits', (data) => {
      const timeLimits = data.timeLimits || {};
      if (timeLimits[hostname] && elapsedTime >= timeLimits[hostname]) {
        // Block the site for the rest of the day
        const blockUntil = Date.now() + getTimeUntilMidnight();
        chrome.storage.local.get('blockedSites', (data) => {
          const blockedSites = data.blockedSites || {};
          blockedSites[hostname] = blockUntil;
          chrome.storage.local.set({ blockedSites: blockedSites });
        });

        // Redirect the tab if the time limit has been reached
        chrome.tabs.update(timers[hostname].tabId, { url: "https://www.microsoft.com" });
        delete timers[hostname];
      } else {
        // Set another alarm if the time limit hasn't been reached yet
        chrome.alarms.create(hostname, { delayInMinutes: 1 });
      }
    });
  }
});

// Listen for messages from the popup to set time limits
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setTimeLimit") {
    chrome.storage.sync.get('timeLimits', (data) => {
      const timeLimits = data.timeLimits || {};
      timeLimits[request.hostname] = request.minutes;
      chrome.storage.sync.set({ timeLimits: timeLimits });
    });
  } else if (request.action === "getBlockedSites") {
    chrome.storage.local.get('blockedSites', (data) => {
      sendResponse({ blockedSites: data.blockedSites || {} });
    });
    return true; // Indicates that the response is sent asynchronously
  }
});

// Clean up expired blocked sites daily
chrome.alarms.create('cleanBlockedSites', { periodInMinutes: 1440 }); // 1440 minutes = 24 hours
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanBlockedSites') {
    chrome.storage.local.get('blockedSites', (data) => {
      const blockedSites = data.blockedSites || {};
      const now = Date.now();
      for (const [hostname, blockUntil] of Object.entries(blockedSites)) {
        if (blockUntil <= now) {
          delete blockedSites[hostname];
        }
      }
      chrome.storage.local.set({ blockedSites: blockedSites });
    });
  }
});