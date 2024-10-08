(function() {

    async function getTranscript(messageId, locationId) {
        //console.log("Getting transcript for messageId:", messageId, "and locationId:", locationId);
        const apiUrl = `https://api.crmextended.com/get-speech-diarization?message_id=${messageId}&location_id=${locationId}`;
        //console.log("API URL:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        //console.log("Response data:", data);
        const diarization_data = data.diarization_data;
        const diarization_summary = data.diarization_summary;
        const diarization_status = data.diarization_status;
        return { diarization_data, diarization_summary, diarization_status };
    }

    function processPhoneCalls(phoneCallMessages, locationId) {
        //console.log("Processing phone calls...");
        phoneCallMessages.forEach((message, index) => {
            const messageId = message.id || `phone-call-${index}`;
            //console.log(`Phone call message ${index + 1} id:`, messageId);

            // Function to process a single message when an audio player is found
            const processMessage = (audioPlayer) => {
                //console.log('Audio player found');
                
                // Check if this message has already been processed
                if (!message.querySelector('.diarization-view-button')) {
                    // Get the transcript from api
                    getTranscript(messageId, locationId)
                        .then(transcriptData => {
                            console.log(`Transcript data for message ${messageId}:`, transcriptData);
                            const diarizationStatus = transcriptData.diarization_status;
                            //console.log(`Diarization status for message ${messageId}:`, diarizationStatus);
                            addDiarizationButtons(message, transcriptData.diarization_data, transcriptData.diarization_summary, diarizationStatus, messageId, locationId);
                        })
                        .catch(error => {
                            console.error(`Error getting transcript for message ${messageId}:`, error);
                        });
                }
            };

            const audioPlayer = message.querySelector('.player-controls');
            if (audioPlayer) {
                processMessage(audioPlayer);
            } else {
                //console.log('No audio player found, setting up observer');
                
                // Set up an observer to watch for the audio player
                const observer = new MutationObserver((mutations, obs) => {
                    const audioPlayer = message.querySelector('.player-controls');
                    if (audioPlayer) {
                        //console.log('Audio player appeared');
                        obs.disconnect(); // Stop observing once we find the audio player
                        processMessage(audioPlayer);
                    }
                });

                // Start observing the message element for changes
                observer.observe(message, {
                    childList: true, // Watch for changes to direct children
                    subtree: true, // Watch the entire subtree for changes
                });
            }
        });
    }

    function addDiarizationButtons(messageElement, diarizationData, diarizationSummary, diarizationStatus, messageId, locationId) {
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

        // Check if the buttons already exist
        if (!messageActionEl.querySelector('.diarization-view-button')) {
            const summaryButton = document.createElement('button');
            summaryButton.textContent = 'Summary';
            summaryButton.classList.add('diarization-summary-button', 'btn', 'btn-secondary');
        
            summaryButton.addEventListener('click', () => {
                console.log("Showing summary popup for message:", messageElement);
                if (diarizationStatus !== "completed" || diarizationSummary === null) {
                    // Refetch data if not completed or summary is null
                    getTranscript(messageId, locationId)
                        .then(newData => {
                            diarizationSummary = newData.diarization_summary;
                            diarizationStatus = newData.diarization_status;
                            showSummaryPopup(diarizationSummary, diarizationStatus);
                        })
                        .catch(error => {
                            console.error("Error refetching data:", error);
                            showSummaryPopup(diarizationSummary, diarizationStatus);
                        });
                } else {
                    showSummaryPopup(diarizationSummary, diarizationStatus);
                }
            });

            const viewTranscriptButton = document.createElement('button');
            viewTranscriptButton.textContent = 'View Transcript';
            viewTranscriptButton.classList.add('diarization-view-button', 'btn', 'btn-primary');
        
            viewTranscriptButton.addEventListener('click', () => {
                console.log("Showing diarization popup for message:", messageElement);
                if (diarizationStatus !== "completed" || !diarizationData) {
                    // Refetch data if not completed or diarization data is missing
                    getTranscript(messageId, locationId)
                        .then(newData => {
                            diarizationData = newData.diarization_data;
                            diarizationStatus = newData.diarization_status;
                            showDiarizationPopup(diarizationData, diarizationStatus);
                        })
                        .catch(error => {
                            console.error("Error refetching data:", error);
                            showDiarizationPopup(diarizationData, diarizationStatus);
                        });
                } else {
                    showDiarizationPopup(diarizationData, diarizationStatus);
                }
            });

            messageActionEl.appendChild(summaryButton);
            messageActionEl.appendChild(viewTranscriptButton);
        }
    }

    function showSummaryPopup(summary, status) {
        const popup = document.createElement('div');
        popup.classList.add('diarization-popup');

        let content;
        if (status === "completed") {
            content = `<div class="diarization-summary">${summary}</div>`;
        } else if (status === "processing") {
            content = "<p>The summary is still being processed. Please check back later.</p>";
        } else {
            content = "<p>Failed to generate summary. Please try again later.</p>";
        }

        popup.innerHTML = `
            <div class="diarization-popup-content">
                <span class="diarization-close-button">&times;</span>
                <span style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Call Summary</span>
                ${content}
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


    function showDiarizationPopup(diarizationData, status) {
        const popup = document.createElement('div');
        popup.classList.add('diarization-popup');
    
        let content;
        if (status === "completed") {
            const segments = diarizationData;
            const speakers = [...new Set(segments.map(segment => segment.speaker))];
            const getColorForSpeaker = (speaker) => {
                const colors = ['#FFF5EE', '#F0FFF0', '#F0F8FF', '#F8F8FF', '#FFFAF0', '#F5F5F5'];
                const index = speakers.indexOf(speaker) % colors.length;
                return colors[index];
            };
    
            content = segments.map(segment => {
                const duration = segment.end - segment.start;
                const formattedDuration = duration.toFixed(2);
                let durationLabel = duration > 59 ? 'minutes' : 'seconds';
                const durationText = `${formattedDuration} ${durationLabel}`;
                const speakerColor = getColorForSpeaker(segment.speaker);
                return `<div class="diarization-segment" style="background-color: ${speakerColor};">
                            <div class="segment-header">
                                <strong>${segment.speaker}:</strong>
                                <span class="duration-text">(${durationText})</span>
                            </div>
                            <div class="segment-text">${segment.text}</div>
                        </div>`;
            }).join('');
        } else if (status === "processing") {
            content = "<p>The transcript is still being processed. Please check back later.</p>";
        } else {
            content = "<p>Failed to generate transcript. Please try again later.</p>";
        }

        popup.innerHTML = `
            <div class="diarization-popup-content">
                <span class="diarization-close-button">&times;</span>
                <span style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Call Transcript</span>
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

        //console.log("URL changed to:", location.href);
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
            if (location.href.includes('/conversations/conversations/') || location.href.includes('/contacts/detail/')) {
                //console.log("Conversation page detected");
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
                            //console.log("Messages found:", messageWrappers.length);
                            
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
                                //console.log("Phone calls found:", phoneCallMessages.length);
                                // Log the ids of the phone call message elements
                                
                                if (!phoneCallsProcessed) {
                                    phoneCallsProcessed = true;
                                    processPhoneCalls(phoneCallMessages, locationId);
                                } else {
                                    //console.log("Phone calls already processed.");
                                }
                            }
                            
                        }
                    }

                    // Start checking for messages
                    checkForMessages();

                    // Set up a timeout to stop checking after a certain period (e.g., 10 seconds)
                    currentProcessingTimeout = setTimeout(() => {
                        if (document.querySelectorAll('.message-wrapper').length === 0) {
                            //console.log("No messages found after timeout. This might be a new conversation.");
                        }
                    }, 10000); // 10 seconds timeout

                    // Add the new message observer
                    observeNewMessages();
                });
            } else {
                ////console.log('Not on the conversations page');
            }
        });
    }

    // New function to observe new messages
    function observeNewMessages() {
        const messagesContainer = document.querySelector('.messages-group-inner');
        if (!messagesContainer) {
            console.error('Messages container not found');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('message-wrapper')) {
                            //console.log('New message detected:', node);
                            
                            // Check if the new message is a phone call
                            if (node.querySelector('.phone-call')) {
                                //console.log('New phone call message detected');
                                
                                // Extract the location ID
                                const locationIdMatch = window.location.href.match(/location\/([^/]+)/);
                                const locationId = locationIdMatch ? locationIdMatch[1] : null;
                                
                                // Process the new phone call message
                                processPhoneCalls([node], locationId);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(messagesContainer, { childList: true, subtree: true });
        //console.log('Now observing for new messages');
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
    
    // Update the styles to include the new summary button
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
            min-width: 430px;
            min-height: 333px;
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
        .diarization-segments{
            display: flex;
            flex-direction: column;
            gap: 5px;
            max-height: 500px;
            overflow-y: auto;
        }
        .diarization-segment {
            margin-bottom: 10px;
            padding: 5px 10px;
            border-radius: 5px;
        }
        .diarization-view-button,
        .diarization-summary-button {
            font-size: 12px;
            padding: 2px 8px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: 5px;
        }
        .diarization-view-button {
            background-color: #007bff;
            color: white;
        }
        .diarization-summary-button {
            background-color: #6c757d;
            color: white;
        }
        .diarization-view-button:hover {
            background-color: #0056b3;
        }
        .diarization-summary-button:hover {
            background-color: #5a6268;
        }
        .message-action {
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            max-height: 30px;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);

})();