function initDiarization() {
    // Get the current page URL
    const url = window.location.href;

    // Extract the location ID using a regular expression
    const locationIdMatch = url.match(/location\/([^/]+)/);
    const locationId = locationIdMatch ? locationIdMatch[1] : null;

    function addDiarizationButton(messageId, segments) {
        const messageElement = document.getElementById(messageId);
    
        if (!messageElement) {
            console.error(`Message element with ID ${messageId} not found.`);
            return;
        }
    
        // Create a new row div to hold the button
        const buttonRow = document.createElement('div');
        buttonRow.classList.add('flex', 'justify-end', 'mt-2');
    
        // Create the button
        const button = document.createElement('button');
        button.textContent = 'View Diarization';
        button.classList.add('diarization-view-button');
    
        // Add the button to the row div
        buttonRow.appendChild(button);
    
        // Append the row div to the message element, right after the class="flex time-date" element
        const timeDateElement = messageElement.querySelector('.flex.time-date');
        timeDateElement.parentNode.insertBefore(buttonRow, timeDateElement.nextSibling);
    
        // Add click event listener for the button
        button.addEventListener('click', () => {
            showDiarizationPopup(segments);
        });
    }
    // Function to show a popup with the diarization segments
    function showDiarizationPopup(segments) {
        // Create a popup container
        const popup = document.createElement('div');
        popup.classList.add('diarization-popup');
    
        // Generate a list of unique speakers
        const speakers = [...new Set(segments.map(segment => segment.speaker))];
    
        // Define a function to get a unique color for each speaker
        const getColorForSpeaker = (speaker) => {
            // You can customize the color generation logic here
            const colors = ['#FFF5EE', '#F0FFF0', '#F0F8FF', '#F8F8FF', '#FFFAF0', '#F5F5F5'];
            const index = speakers.indexOf(speaker) % colors.length;
            return colors[index];
        };
    
        // Populate the popup with segments
        const content = segments.map(segment => {
            const speakerColor = getColorForSpeaker(segment.speaker);
            return `<div class="diarization-segment" style="background-color: ${speakerColor};">
                        <strong>${segment.speaker}:</strong> ${segment.text}
                    </div>`;
        }).join('');
    
        popup.innerHTML = `
            <div class="diarization-popup-content">
                <span class="diarization-close-button">&times;</span>
                <h2>Diarization</h2>
                <div class="diarization-segments">${content}</div>
            </div>
        `;
    
        // Append the popup to the body
        document.body.appendChild(popup);
    
        // Close button functionality
        const closeButton = popup.querySelector('.diarization-close-button');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    
        // Optionally, add functionality to close the popup when clicking outside of it
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                document.body.removeChild(popup);
            }
        });
    }

    if (locationId) {

        // Get all elements with the class "message-wrapper"
        const messageWrappers = document.querySelectorAll('.message-wrapper');

        // Filter the ones that also contain the class "phone-call" within them
        const phoneCallMessages = Array.from(messageWrappers).filter(wrapper => 
            wrapper.querySelector('.phone-call')
        );

        // Log the "message_id" and make API calls for each
        phoneCallMessages.forEach(async (wrapper) => {
            const messageId = wrapper.id;

            // Construct the API URL with message_id and location_id
            const apiUrl = `https://api.crmextended.com/get-speech-diarization?message_id=${messageId}&location_id=${locationId}`;

            try {
                // Make the API call
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`API call failed with status ${response.status}`);
                }

                // Parse the JSON response
                const result = await response.json();
                const data = result.data[0];

                // Extracting data into variables
                const diarizationId = data.id;
                const createdAt = data.created_at;
                const updatedAt = data.updated_at;
                const responseMessageId = data.message_id;
                const responseLocationId = data.location_id;
                const language = data.language;
                const processingTime = data.processing_time;
                const audioDuration = data.audio_duration;
                const processingRate = data.processing_rate;

                // Segments and speakers
                const segments = data.segments;

                // Loop through and log each segment
                segments.forEach((segment, index) => {
                    const start = segment.start;
                    const end = segment.end;
                    const text = segment.text;
                    const speaker = segment.speaker;
                });

                // Add the diarization button to the message element
                addDiarizationButton(messageId, segments);

            } catch (error) {
                console.error(`Error for message_id ${messageId}:`, error);
            }
        });

    } else {
        console.error('Location ID not found in the URL.');
    }

    // Add some basic styles for the popup with unique class names
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
    margin-top: 10px;
    padding: 5px 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    max-width: 130px;
    width: 100%; /* This will ensure the button takes up the full 100px width */
    white-space: nowrap; /* This will prevent the text from wrapping */
    overflow: hidden;
    text-overflow: ellipsis; /* This will show "..." if the text exceeds the button width */
}
        .diarization-view-button:hover {
            background-color: #0056b3;
        }
    `;
    document.head.appendChild(style);
}

// Check for the existence of the "message-body--conversation" class before running the initDiarization function
const intervalId = setInterval(() => {
    if (document.querySelector('.message-body--conversation')) {
        initDiarization();
        clearInterval(intervalId);
    }
}, 100);