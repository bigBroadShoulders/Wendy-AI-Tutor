const chatbox = document.getElementById('chatBox');
const userInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const saveButton = document.getElementById('saveButton');

// JSON file locations
const preambleFile = 'data/preamble.json';
const wendyFile = 'data/wendy.json';
const userFile = 'data/user.json';
const topicFile = 'data/topic.json';

let wendyData = null; // Store Wendy's persona
let topicData = null;  // Store the topic data
let userData = null;

function sendMessageToServer(userMessage) {
    const payload = {
        message: userMessage,
        userId: 'someUserId', // You might want to make this dynamic later
        preamble: sessionStorage.getItem('preamble'),
        wendyConfig: sessionStorage.getItem('wendy'),
        userConfig: sessionStorage.getItem('user'),
        topicConfig: sessionStorage.getItem('topic'),
    };

    fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Corrected Content-Type
        },
        body: JSON.stringify(payload),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (data.botReply) {
                handleLLMResponse(data.botReply);
            } else {
                console.error('Bot reply missing from server response.');
                displayMessage('Sorry, I encountered an error.', 'bot');
            }
        })
        .catch((error) => {
            console.error('Fetch error:', error); // Log the error
            displayMessage('Sorry, I encountered an error.', 'bot');
        });
}

clearButton.addEventListener('click', () => {
    chatbox.innerHTML = '';
});

function extractLastBotMessage(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const messageElements = tempDiv.querySelectorAll('.message.bot-message');
    if (messageElements.length === 0) {
        return ''; // Return empty string if no bot messages
    }
    const lastBotMessageElement = messageElements[messageElements.length - 1];
    const textContent = lastBotMessageElement.textContent;
    const senderName = "Wendy:";
    const cleanText = textContent.replace(senderName, '').trim();
    return cleanText;
}

saveButton.addEventListener('click', () => {
    const chatData = chatbox.innerHTML;
    const lastBotMessage = extractLastBotMessage(chatData);

    if (lastBotMessage) {
        const timestamp = new Date().toLocaleString();
        const textToCopy = `${timestamp}\n${lastBotMessage}`; // Timestamp on top, newline, message
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                alert('Last message copied to clipboard as plain text. Open your text editor and paste with Ctrl+V.');
            })
            .catch((err) => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy last message. Try selecting the text in the chatbox and copying manually.');
            });
    } else {
        alert('No message found to copy.');
    }
});

sendButton.addEventListener('click', () => {
    const userMessage = userInput.value;

    if (userMessage.trim() !== '') {
        displayMessage(userMessage, 'user');
        sendMessageToServer(userMessage); // Send the user message, which will also include the loaded JSON data from sessionStorage
        userInput.value = '';
    } else {
        // User message is empty. Do nothing.
    }
});

function displayMessage(message, sender) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender === 'bot' ? 'bot-message' : 'user-message');
    const senderName = sender === 'bot' ? 'Wendy' : 'You';

    if (sender === 'bot') {
        try {
            if (message && message.trim()) {
                const signalRegex = /^\[(w?)(\d+)\]\s*/;
                const match = message.match(signalRegex);
                if (match && match[1] === 'w') {
                    const signalNumber = parseInt(match[2], 10);
                    const MAX_WENDY_INDEX = 15;
                    if (signalNumber >= 0 && signalNumber <= MAX_WENDY_INDEX) {
                        // Display image in chat
                        const imgDiv = document.createElement('div');
                        imgDiv.classList.add('message', 'bot-message'); // Style as bot message
                        imgDiv.innerHTML = `<img src="images/wendy${signalNumber}.png" alt="Wendy ${signalNumber}" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;">`;
                        chatBox.appendChild(imgDiv);
                        messageDiv.innerHTML = `<strong>${senderName}:</strong> ${marked.parse(message.substring(match[0].length))}`;
                    } else {
                        messageDiv.innerHTML = `<strong>${senderName}:</strong> ${marked.parse(
                            message
                        )}`;
                    }
                } else {
                    messageDiv.innerHTML = `<strong>${senderName}:</strong> ${marked.parse(
                        message
                    )}`;
                }
            } else if (message !== null && message !== undefined) {
                messageDiv.innerHTML = `<strong>${senderName}:</strong> `;
            }
        } catch (e) {
            console.error('Markdown parse error:', e);
            messageDiv.textContent = `${senderName}: ${message}`;
        }
    } else {
        messageDiv.textContent = `${senderName}: ${message}`;
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function handleLLMResponse(response) {
    const MAX_WENDY_INDEX = 15;
    const signalRegex = /^\[(w?)(\d+)\]\s*/;
    const match = response.match(signalRegex);
    let textToDisplay = response.trim();

    if (match) {
        const signalType = match[1];
        const signalNumberStr = match[2];
        const fullSignal = match[0];
        const signalNumber = parseInt(signalNumberStr, 10);
        textToDisplay = response.substring(fullSignal.length).trim();

        if (signalType === 'w') {
            if (signalNumber >= 0 && signalNumber <= MAX_WENDY_INDEX) {
                // Display image in chat
                const imgDiv = document.createElement('div');
                imgDiv.classList.add('message', 'bot-message'); // Style as bot message
                imgDiv.innerHTML = `<img src="images/wendy${signalNumber}.png" alt="Wendy ${signalNumber}" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;">`;
                chatbox.appendChild(imgDiv);
                return; // Exit after displaying Wendy image in chat
            } else {
                console.warn(
                    `Invalid Wendy index ${signalNumber} in signal. Max index is ${MAX_WENDY_INDEX}. Ignoring image signal part.`
                );
            }
        }
    }
    // Display the text message
    if (textToDisplay) { // Only display if there is text to display
        displayMessage(textToDisplay, 'bot');
    }
}

// Function to load JSON data with a delay and store in sessionStorage
function loadJSONWithDelay(file, storageKey, delay, message = '') {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (message) {
                displayMessage(message, 'bot'); // Display message
            }
            fetch(file)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${file}: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    sessionStorage.setItem(storageKey, JSON.stringify(data));
                    console.log(`Loaded ${file} into sessionStorage as '${storageKey}'`);
                    resolve(data);
                })
                .catch((error) => {
                    console.error(`Error loading ${file}:`, error);
                    displayMessage(`Error loading ${file}. The application may not function correctly.`, 'bot');
                    resolve(null); // Resolve with null to prevent blocking
                });
        }, delay);
    });
}

// Load JSON files in sequence with delays
async function initializeChat() {
    const preambleData = await loadJSONWithDelay(preambleFile, 'preamble', 0);
    wendyData = await loadJSONWithDelay(wendyFile, 'wendy', 0, 'Initialising ...please wait');
    userData = await loadJSONWithDelay(userFile, 'user', 2000);
    topicData = await loadJSONWithDelay(topicFile, 'topic', 4000);

    // After all JSON data is loaded, start the chat
    if (wendyData) {
        displayMessage("[w0] Hi, how are you doing today Stevie?", 'bot'); // start the chat  }
}
}
// Start the initialization process
initializeChat();
