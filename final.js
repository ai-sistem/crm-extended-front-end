(function() {

    function onURLChange() {
        console.log("URL changed to:", location.href);
        // Add your URL change handling logic here
    }
    
    let lastUrl = location.href;
    
    // Run on page load
    onURLChange();
    
    // Check for URL changes
    function checkURLChange() {
        if (lastUrl !== location.href) {
            lastUrl = location.href;
            onURLChange();
        }
    }
    
    // Set up an interval to check for URL changes
    setInterval(checkURLChange, 100);
})();