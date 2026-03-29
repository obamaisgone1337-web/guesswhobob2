// 1. CONFIGURATION
const IMAGE_EXTENSION = '.jpg';
// I've wrapped this in a very clean string to prevent that "numeric literal" error
const API_KEY = "LefjYQ.8r1mwQ:ZH_2I7wseILmuGoCOUiOFoJ-XX3zrbK2HTPIDpst20I"; 

// 2. GLOBAL VARIABLES
let ably, channel;
const shapes = ['circle', 'moon', 'square', 'cloud', 'triangle'];
const characters = [];
let mySecret = null;
let friendSecretName = "";
let isGuessMode = false;
let myScore = 0;
let friendScore = 0;

// 3. GENERATE DATA
shapes.forEach(shape => {
    for (let i = 1; i <= 5; i++) {
        characters.push({ 
            name: shape.charAt(0).toUpperCase() + shape.slice(1) + " " + i, 
            file: shape + i + IMAGE_EXTENSION 
        });
    }
});

// 4. THE FUNCTIONS (Defined globally so HTML can find them)
function addMessage(text) {
    const msgBox = document.getElementById('messages');
    if (msgBox) {
        const p = document.createElement('p');
        p.innerText = text;
        msgBox.appendChild(p);
        msgBox.scrollTop = msgBox.scrollHeight;
    }
}

function updateScoreUI() {
    const s1 = document.getElementById('my-score');
    const s2 = document.getElementById('friend-score');
    if (s1) s1.innerText = myScore;
    if (s2) s2.innerText = friendScore;
}

function toggleGuessMode() {
    isGuessMode = !isGuessMode;
    const btn = document.getElementById('guess-mode-btn');
    if (btn) {
        btn.innerText = isGuessMode ? "CLICK YOUR ANSWER!" : "GUESS MODE: OFF";
        btn.classList.toggle('active');
    }
}

function sendMsg() {
    const input = document.getElementById('chat-input');
    const nameInput = document.getElementById('name-input');
    if (input && input.value.trim() !== "" && channel) {
        const sender = nameInput ? nameInput.value : "Player";
        channel.publish('chat', { sender: sender, text: input.value });
        addMessage("You: " + input.value);
        input.value = '';
    }
}

function handleOfficialGuess(char) {
    const nameInput = document.getElementById('name-input');
    const myName = nameInput ? nameInput.value : "Player";

    if (char.name === friendSecretName) {
        myScore++;
        channel.publish('chat', { sender: "SYSTEM", text: "CORRECT! " + myName + " won this round!" });
        channel.publish('scoreUpdate', { winner: 'me' });
    } else {
        friendScore++;
        channel.publish('chat', { sender: "SYSTEM", text: "WRONG! " + myName + " picked " + char.name + ". It was " + friendSecretName });
        channel.publish('scoreUpdate', { winner: 'friend' });
    }
    updateScoreUI();
    toggleGuessMode();
    setTimeout(initGame, 3000);
}

function initGame() {
    const board = document.getElementById('game-board');
    if (!board) return;
    
    board.innerHTML = '';
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card';
        // Note: Make sure images are in the SAME folder as index.html
        card.innerHTML = '<img src="' + char.file + '" style="width:100%; pointer-events:none;"><p>' + char.name + '</p>';
        
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
    
    if (channel) channel.publish('syncSecret', { secret: mySecret.name });
}

function requestReset() {
    initGame();
}

// 5. INITIALIZE ABLY
window.onload = function() {
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
                setTimeout(initGame, 3000);
            }
        });

        initGame();
        console.log("Game Initialized Successfully");
    } catch (e) {
        console.error("Ably Startup Error: ", e);
    }
};

// Enter key support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMsg();
});
