// Object to store active timers
let timers = {};

// Initialize storage when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ timeLimits: {} });
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
  }
});

// Function to start a timer for a specific hostname
function startTimer(hostname, tabId) {
  if (!timers[hostname]) {
    timers[hostname] = { startTime: Date.now(), tabId: tabId };
    chrome.alarms.create(hostname, { delayInMinutes: 1 });
  }
}

// Listen for alarms to check if time limits have been reached
chrome.alarms.onAlarm.addListener((alarm) => {
  const hostname = alarm.name;
  if (timers[hostname]) {
    const elapsedTime = (Date.now() - timers[hostname].startTime) / 60000; // Convert to minutes
    chrome.storage.sync.get('timeLimits', (data) => {
      const timeLimits = data.timeLimits || {};
      if (timeLimits[hostname] && elapsedTime >= timeLimits[hostname]) {
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
  }
});