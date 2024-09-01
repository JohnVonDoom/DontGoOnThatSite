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
      // Refresh the blocked sites list
      displayBlockedSites();
    });
  } else {
    // Display an error message if input is invalid
    document.getElementById('status').textContent = "Please enter a valid website and time limit.";
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
      for (const [hostname, blockUntil] of Object.entries(blockedSites)) {
        const li = document.createElement('li');
        const remainingTime = Math.max(0, Math.round((blockUntil - Date.now()) / 60000)); // in minutes
        li.textContent = `${hostname}: Blocked for ${remainingTime} more minutes`;
        ul.appendChild(li);
      }
      blockedSitesElement.appendChild(ul);
    }
  });
}

// Call displayBlockedSites when the popup is opened
document.addEventListener('DOMContentLoaded', displayBlockedSites);

// Refresh blocked sites list every minute
setInterval(displayBlockedSites, 60000);