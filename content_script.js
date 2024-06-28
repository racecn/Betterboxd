console.log("Content script loaded and running");

// Function to process each poster container
function processPosterContainer(container) {
  const posterDiv = container.querySelector('.linked-film-poster');
  if (!posterDiv) {
    console.log("No poster found within container:", container);
    return; // Skip this container if no poster element found
  }

  const movieTitle = posterDiv.getAttribute('data-film-name');
  if (!movieTitle) {
    console.log("No movie title found for poster:", posterDiv);
    return; // Skip processing if no movie title found
  }

  const releaseYear = posterDiv.getAttribute('data-film-release-year');
  if (releaseYear) {
    console.log(`Processing poster: ${movieTitle}, release year: ${releaseYear}`);

    // Create container div for poster and year
    const containerDiv = document.createElement('div');
    containerDiv.className = 'poster-with-year';

    // Create poster image element
    const posterImg = document.createElement('img');
    posterImg.src = posterDiv.getAttribute('data-poster-url');
    posterImg.alt = movieTitle;
    containerDiv.appendChild(posterImg);

    // Create <a> element for the year overlay
    const yearLink = document.createElement('a');
    yearLink.className = 'year-overlay';
    yearLink.textContent = releaseYear;
    yearLink.href = `https://1337x.to/search/${encodeURIComponent(movieTitle + ' ' + releaseYear)}/1/`;
    yearLink.target = '_blank'; // Open link in a new tab/window
    containerDiv.appendChild(yearLink);

    // Create "Copy Link" button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-link-button';
    copyButton.textContent = 'Copy Link';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(yearLink.href).then(() => {
        console.log(`Copied link to clipboard: ${yearLink.href}`);
      }).catch(err => {
        console.error('Failed to copy link: ', err);
      });
    };
    containerDiv.appendChild(copyButton);

    // Append container div to the poster container
    container.appendChild(containerDiv);
    container.style.position = 'relative'; // Ensure relative positioning for absolute overlay
  } else {
    console.log(`No release year found for poster: ${movieTitle}`);
  }
}

// Function to wait for elements matching selector, including future additions
function waitForLazyElements(selector, callback) {
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches(selector)) {
            callback(node);
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check for already existing elements
  document.querySelectorAll(selector).forEach((element) => {
    callback(element);
  });
}

// Wait for all poster containers to be loaded, including lazy-loaded ones
waitForLazyElements('.poster-container', (posterContainer) => {
  console.log(`Found a new poster container`);

  // Process the newly found poster container
  processPosterContainer(posterContainer);
});
