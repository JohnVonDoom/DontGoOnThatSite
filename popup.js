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
    });
  } else {
    // Display an error message if input is invalid
    document.getElementById('status').textContent = "Please enter a valid website and time limit.";
  }
});