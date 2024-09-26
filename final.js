(function() {

    async function getTranscript(messageId, locationId) {
        console.log("Getting transcript for messageId:", messageId, "and locationId:", locationId);
        const apiUrl = `https://api.crmextended.com/get-speech-diarization?message_id=${messageId}&location_id=${locationId}`;
        console.log("API URL:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Response data:", data);
        const diarization_data = data.diarization_data;
        const diarization_summary = data.diarization_summary;
        return { diarization_data, diarization_summary };
    }

    function processPhoneCalls(phoneCallMessages, locationId) {
        console.log("Processing phone calls...");
        phoneCallMessages.forEach((message, index) => {
            const messageId = message.id || `phone-call-${index}`;
            console.log(`Phone call message ${index + 1} id:`, messageId);
            
            // Check if this message has already been processed
            if (!message.querySelector('.diarization-view-button')) {
                // Get the transcript from api
                getTranscript(messageId, locationId)
                    .then(transcriptData => {
                        console.log(`Diarization data for message ${messageId}:`, transcriptData);
                        const diarizationStatus = transcriptData.status;
                        console.log(`Diarization status for message ${messageId}:`, diarizationStatus);
                        // Pass the diarization_data instead of segments
                        addDiarizationButton(message, transcriptData.diarization_data);
                    })
                    .catch(error => {
                        console.error(`Error getting transcript for message ${messageId}:`, error);
                        // Handle the error appropriately
                    });
            }
        });
    }

    function addDiarizationButton(messageElement, diarizationData) {
        // Check if a message action div already exists
        let messageActionEl = messageElement.querySelector('.message-action');
        
        // If it doesn't exist, create it
        if (!messageActionEl) {
            messageActionEl = document.createElement('div');
            messageActionEl.classList.add('message-action');
            
            // Find the time-date element and insert the message action div after it
            const timeDateElement = messageElement.querySelector('.flex.time-date');
            if (timeDateElement) {
                timeDateElement.parentNode.insertBefore(messageActionEl, timeDateElement.nextSibling);
            } else {
                console.error('Could not find .flex.time-date element');
                return;
            }
        }

        // Check if the button already exists
        if (!messageActionEl.querySelector('.diarization-view-button')) {
            const button = document.createElement('button');
            button.textContent = 'View Transcript';
            button.classList.add('diarization-view-button', 'btn', 'btn-primary');
        
            button.addEventListener('click', () => {
                console.log("Showing diarization popup for message:", messageElement);
                console.log("Diarization data:", diarizationData);
                showDiarizationPopup(diarizationData);
            });

            messageActionEl.appendChild(button);
        }
    }

    function showDiarizationPopup(diarizationData) {
        console.log("Mapping diarization data to HTML...: ", diarizationData);

        // Check if diarizationData is undefined or null
        if (!diarizationData || !Array.isArray(diarizationData)) {
            console.error("Diarization data is undefined, null, or not an array");
            return;
        }

        const segments = diarizationData; // diarizationData is already the array of segments

        console.log("Mapping segments to HTML...: ", segments);

        const popup = document.createElement('div');
        popup.classList.add('diarization-popup');
    
        const speakers = [...new Set(segments.map(segment => segment.speaker))];
    
        const getColorForSpeaker = (speaker) => {
            const colors = ['#FFF5EE', '#F0FFF0', '#F0F8FF', '#F8F8FF', '#FFFAF0', '#F5F5F5'];
            const index = speakers.indexOf(speaker) % colors.length;
            return colors[index];
        };

        
    
        const content = segments.map(segment => {
            const speakerColor = getColorForSpeaker(segment.speaker);
            return `<div class="diarization-segment" style="background-color: ${speakerColor};">
                        <strong>${segment.speaker}:</strong> ${segment.text}
                    </div>`;
        }).join('');
    
        popup.innerHTML = `
            <div class="diarization-popup-content">
                <span class="diarization-close-button">&times;</span>
                <h2>Call Transcript</h2>
                <div class="diarization-segments">${content}</div>
            </div>
        `;
    
        document.body.appendChild(popup);
    
        const closeButton = popup.querySelector('.diarization-close-button');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                document.body.removeChild(popup);
            }
        });
    }

    function waitForElm(selector) {
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

    let currentCheckForMessagesTimeout = null;
    let currentProcessingTimeout = null;

    function onURLChange() {
        // Extract the location ID using a regular expression
        const locationIdMatch = window.location.href.match(/location\/([^/]+)/);
        const locationId = locationIdMatch ? locationIdMatch[1] : null;

        console.log("URL changed to:", location.href);
        // Cancel any existing timeouts
        if (currentCheckForMessagesTimeout) {
            clearTimeout(currentCheckForMessagesTimeout);
        }
        if (currentProcessingTimeout) {
            clearTimeout(currentProcessingTimeout);
        }

        // Wait for GHL layout element to load
        waitForElm('.w-full').then((elm) => {            
            // Check if we're on the conversations page
            if (location.href.includes('/conversations/conversations/')) {
                console.log("On conversations page");
                // Add your conversations page specific code here
                waitForElm('.messages-group-inner').then((elm) => {
                    
                    let phoneCallsProcessed = false;
                    // Function to check for messages
                    function checkForMessages() {
                        const messageWrappers = document.querySelectorAll('.message-wrapper');
                        const phoneCallMessages = Array.from(messageWrappers).filter(wrapper => 
                            wrapper.querySelector('.phone-call')
                        );

                        // If no messages found, check again after a short delay
                        if (messageWrappers.length === 0) {
                            currentCheckForMessagesTimeout = setTimeout(checkForMessages, 500); // Check again after 500ms
                        } else {
                            console.log("Messages found:", messageWrappers.length);
                            
                            // Message actions styling
                            const messageActionStyle = document.createElement('style');
                            messageActionStyle.innerHTML = `
                                .message-action {
                                    display: flex;
                                    flex-direction: row;
                                    justify-content: flex-end;
                                    max-height: 30px;
                                    border-radius: 5px;
                                }
                                .message-action .btn {
                                    font-size: 12px;
                                    padding: 2px 8px;
                                    line-height: 1.5;
                                }
                                .flex .time-date {
                                    justify-content: space-between;
                                    align-items: center;
                                }
                            `;
                            document.head.appendChild(messageActionStyle);

                            // Itterate messageWraappers and get class="messages-single" from inside each messageWrapper
                            messageWrappers.forEach(wrapper => {
                                const dateTimeElement = wrapper.querySelector('.messages-single > .time-date');
                                const messageActionEl = document.createElement('div');
                                messageActionEl.className = 'message-action';
                                dateTimeElement.appendChild(messageActionEl);
                            });

                            if (phoneCallMessages.length > 0) {
                                // Run phone call processing
                                console.log("Phone calls found:", phoneCallMessages.length);
                                // Log the ids of the phone call message elements
                                
                                if (!phoneCallsProcessed) {
                                    phoneCallsProcessed = true;
                                    processPhoneCalls(phoneCallMessages, locationId);
                                } else {
                                    console.log("Phone calls already processed.");
                                }
                            }
                            
                        }
                    }

                    // Start checking for messages
                    checkForMessages();

                    // Set up a timeout to stop checking after a certain period (e.g., 10 seconds)
                    currentProcessingTimeout = setTimeout(() => {
                        if (document.querySelectorAll('.message-wrapper').length === 0) {
                            console.log("No messages found after timeout. This might be a new conversation.");
                        }
                    }, 10000); // 10 seconds timeout
                });
            } else {
                //console.log('Not on the conversations page');
            }
        });
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

    // Add styles for the popup and button
    const style = document.createElement('style');
    style.textContent = `
        .diarization-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .diarization-popup-content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
            position: relative;
        }
        .diarization-close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            font-size: 24px;
        }
        .diarization-segment {
            margin-bottom: 10px;
            padding: 5px 10px;
            border-radius: 5px;
        }
        .diarization-view-button {
            font-size: 12px;
            padding: 2px 8px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .diarization-view-button:hover {
            background-color: #0056b3;
        }
    `;
    document.head.appendChild(style);

})();