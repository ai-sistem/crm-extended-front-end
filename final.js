(function() {

    async function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }
    
            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });
    
            // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    async function onURLChange() {
        console.log("URL changed to:", location.href);
        // Wait for GHL layout element to load
        const layout = await waitForElm("w-full");
        console.log("GHL layout element loaded:", layout);
        // Add your URL change handling logic here
    }
    
    let lastUrl = location.href;
    
    // Run on page load
    onURLChange();
    
    // Check for URL changes
    async function checkURLChange() {
        if (lastUrl !== location.href) {
            lastUrl = location.href;
            await onURLChange();
        }
    }
    
    // Set up an interval to check for URL changes
    setInterval(checkURLChange, 100);
})();