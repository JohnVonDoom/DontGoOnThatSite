// Add event listener to the "Set Limit" button
document.getElementById('setLimit').addEventListener('click', () => {
  // Get the hostname and minutes from the input fields
  const hostname = document.getElementById('hostname').value;
  const minutes = parseInt(document.getElementById('minutes').value, 10);

  // Validate input: ensure hostname is provided and minutes is a positive number
  if (hostname && !isNaN(minutes) && minutes > 0) {
    // Send a message to the background script to set the time limit
    chrome.runtime.sendMessage({
      action: "setTimeLimit",
      hostname: hostname,
      minutes: minutes
    }, (response) => {
      // Update the status message to confirm the time limit has been set
      document.getElementById('status').textContent = `Time limit set for ${hostname}: ${minutes} minutes`;
      document.getElementById('status').style.display = 'block';
      // Refresh the blocked sites list and active time limits
      displayBlockedSites();
      displayActiveTimeLimits();
    });
  } else {
    // Display an error message if input is invalid
    document.getElementById('status').textContent = "Please enter a valid website and time limit.";
    document.getElementById('status').style.display = 'block';
  }
});

// Function to display blocked sites
function displayBlockedSites() {
  chrome.runtime.sendMessage({ action: "getBlockedSites" }, (response) => {
    const blockedSitesElement = document.getElementById('blockedSites');
    blockedSitesElement.innerHTML = ''; // Clear previous content

    const blockedSites = response.blockedSites;
    if (Object.keys(blockedSites).length === 0) {
      blockedSitesElement.textContent = 'No sites are currently blocked.';
    } else {
      const ul = document.createElement('ul');
      ul.className = 'list-group';
      for (const [hostname, blockUntil] of Object.entries(blockedSites)) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        const remainingTime = Math.max(0, Math.round((blockUntil - Date.now()) / 60000)); // in minutes
        li.innerHTML = `${hostname}: Blocked for ${remainingTime} more minutes`;
        
        const unblockBtn = document.createElement('button');
        unblockBtn.textContent = 'Unblock';
        unblockBtn.className = 'btn btn-sm btn-outline-danger unblock-btn';
        unblockBtn.addEventListener('click', () => unblockSite(hostname));
        
        li.appendChild(unblockBtn);
        ul.appendChild(li);
      }
      blockedSitesElement.appendChild(ul);
    }
  });
}

// Function to unblock a site
function unblockSite(hostname) {
  chrome.runtime.sendMessage({
    action: "unblockSite",
    hostname: hostname
  }, (response) => {
    if (response.success) {
      document.getElementById('status').textContent = `${hostname} has been unblocked.`;
      document.getElementById('status').style.display = 'block';
      displayBlockedSites(); // Refresh the list
    } else {
      document.getElementById('status').textContent = `Failed to unblock ${hostname}.`;
      document.getElementById('status').style.display = 'block';
    }
  });
}

// Function to display active time limits
function displayActiveTimeLimits() {
  chrome.storage.sync.get('timeLimits', (data) => {
    const timeLimits = data.timeLimits || {};
    const activeTimeLimitsElement = document.getElementById('activeTimeLimits');
    activeTimeLimitsElement.innerHTML = ''; // Clear previous content

    if (Object.keys(timeLimits).length === 0) {
      activeTimeLimitsElement.textContent = 'No active time limits.';
    } else {
      const ul = document.createElement('ul');
      ul.className = 'list-group';
      for (const [hostname, limit] of Object.entries(timeLimits)) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        chrome.runtime.sendMessage({
          action: "getRemainingTime",
          hostname: hostname
        }, (response) => {
          const remainingTime = response.remainingTime;
          li.textContent = `${hostname}: ${remainingTime} minutes remaining`;
        });
        
        ul.appendChild(li);
      }
      activeTimeLimitsElement.appendChild(ul);
    }
  });
}

// Call displayBlockedSites and displayActiveTimeLimits when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
  displayBlockedSites();
  displayActiveTimeLimits();
});

// Refresh blocked sites list and active time limits every minute
setInterval(() => {
  displayBlockedSites();
  displayActiveTimeLimits();
}, 60000);