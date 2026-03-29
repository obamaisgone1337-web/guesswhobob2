// 1. CONFIGURATION
const IMAGE_EXTENSION = '.jpg';
// I am using the key exactly as you provided it. 
// If it still says "40101", please double-check the Ably dashboard for the FULL string.
const API_KEY = 'LefjYQ.8r1mwQ:ZH_2I7wseILmuGoCOUiOFoJ-XX3zrbK2HTPIDpst20I'; 

// 2. GLOBAL VARIABLES
let ably, channel;
const shapes = ['circle', 'moon', 'square', 'cloud', 'triangle'];
const characters = [];
let mySecret = null;
let friendSecretName = "";
let isGuessMode = false;
let myScore = 0;
let friendScore = 0;

// 3. GENERATE CHARACTERS
shapes.forEach(shape => {
    for (let i = 1; i <= 5; i++) {
        characters.push({ 
            name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${i}`, 
            file: `${shape}${i}${IMAGE_EXTENSION}` 
        });
    }
});

// 4. STARTUP
window.onload = function() {
    console.log("Page Loaded.");

    try {
        ably = new Ably.Realtime(API_KEY);
        channel = ably.channels.get('guess-who-logic');
        
        channel.subscribe('chat', (msg) => {
            if (msg.connectionId !== ably.connection.id) {
                addMessage(msg.data.sender + ': ' + msg.data.text);
            }
        });

        channel.subscribe('syncSecret', (msg) => {
            if (msg.connectionId !== ably.connection.id) {
                friendSecretName = msg.data.secret;
            }
        });

        channel.subscribe('scoreUpdate', (msg) => {
            if (msg.connectionId !== ably.connection.id) {
                if (msg.data.winner === 'me') friendScore++; else myScore++;
                updateScoreUI();
                setTimeout(initGame, 2000);
            }
        });

        console.log("Ably Initialized.");
    } catch (e) {
        console.error("Ably Error:", e);
    }

    initGame();
};

// 5. GLOBAL FUNCTIONS (Moved outside so HTML can see them)
function initGame() {
    const board = document.getElementById('game-board');
    if (!board) return;
    
    board.innerHTML = '';
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<img src="${char.file}" style="width:100%; pointer-events:none;"><p>${char.name}</p>`;
        
        card.onclick = function() {
            if (!isGuessMode) {
                card.classList.toggle('flipped');
            } else {
                handleOfficialGuess(char);
            }
        };
        board.appendChild(card);
    });

    mySecret = characters[Math.floor(Math.random() * characters.length)];
    const secretDisplay = document.getElementById('my-character');
    if (secretDisplay) secretDisplay.innerText = mySecret.name;
    
    if(channel) channel.publish('syncSecret', { secret: mySecret.name });
}

function handleOfficialGuess(char) {
    const nameInput = document.getElementById('name-input');
    const myName = nameInput ? nameInput.value : "Player";

    if (char.name === friendSecretName) {
        myScore++;
        channel.publish('chat', { sender: "SYSTEM", text: `CORRECT! ${myName} found it!` });
        channel.publish('scoreUpdate', { winner: 'me' });
    } else {
        friendScore++;
        channel.publish('chat', { sender: "SYSTEM", text: `WRONG! ${myName} picked ${char.name}. It was ${friendSecretName}.` });
        channel.publish('scoreUpdate', { winner: 'friend' });
    }
    updateScoreUI();
    toggleGuessMode();
}

function toggleGuessMode() {
    isGuessMode = !isGuessMode;
    const btn = document.getElementById('guess-mode-btn');
    if (btn) {
        btn.innerText = isGuessMode ? "CLICK YOUR ANSWER!" : "GUESS MODE: OFF";
        btn.classList.toggle('active');
    }
}

function updateScoreUI() {
    document.getElementById('my-score').innerText = myScore;
    document.getElementById('friend-score').innerText = friendScore;
}

function sendMsg() {
    const input = document.getElementById('chat-input');
    const nameInput = document.getElementById('name-input');
    if (input && input.value.trim() !== "") {
        const name = nameInput ? nameInput.value : "Player";
        channel.publish('chat', { sender: name, text: input.value });
        addMessage('You: ' + input.value);
        input.value = '';
    }
}

function addMessage(text) {
    const msgBox = document.getElementById('messages');
    if (msgBox) {
        const p = document.createElement('p');
        p.innerText = text;
        msgBox.appendChild(p);
        msgBox.scrollTop = msgBox.scrollHeight;
    }
}

function requestReset() {
    initGame();
}
