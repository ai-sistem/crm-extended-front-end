(function() {
    console.log("Script loaded");
    let lastUrl = '';

    function handleUrlChange() {
        const currentUrl = location.href;

        if (lastUrl === '') {
            console.log("Page loaded");
            console.log("URL:", currentUrl);
        } else if (lastUrl !== currentUrl) {
            console.log("Page has changed from " + lastUrl + " to " + currentUrl);

            // Check if the current URL contains "conversations/conversations/"
            if (currentUrl.includes('conversations/conversations/')) {
                console.log("On conversation page");
                initDiarization();
            }
        }

        lastUrl = currentUrl;
    }

    // Create a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(handleUrlChange);

    // Start observing the document with the configured parameters
    observer.observe(document, { subtree: true, childList: true });

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);

    // Check for changes on hash change (for hash-based routing)
    window.addEventListener('hashchange', handleUrlChange);

    // Initial check (this will log the initial page load)
    handleUrlChange();
})();