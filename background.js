// Listen for page reloads and navigation events
browser.webNavigation.onCommitted.addListener(details => {
    // Check if the navigation is to the main frame and not a subframe
    if (details.frameId === 0) {
      // Reload content script by executing a script in the tab
      browser.tabs.executeScript(details.tabId, { file: "content.js" })
        .then(() => {
          console.log("Content script reloaded after navigation or refresh");
        })
        .catch(error => {
          console.error("Error reloading content script:", error);
        });
    }
  });
  