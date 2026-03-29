const IMAGE_EXTENSION = '.jpg';
const API_KEY = 'LefjYQ.8r1mwQ:ZH_2I7wseILmuGoCOUiOFoJ-XX3zrbK2HTPIDpst20I'; // <--- PASTE YOUR ROOT KEY HERE

let ably, channel;
const shapes = ['circle', 'moon', 'square', 'cloud', 'triangle'];
const characters = [];
let mySecret = null;
let friendSecretName = "";
let isGuessMode = false;
let myScore = 0;
let friendScore = 0;

// 1. Generate Character Data
shapes.forEach(shape => {
    for (let i = 1; i <= 5; i++) {
        characters.push({ 
            name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${i}`, 
            file: `${shape}${i}${IMAGE_EXTENSION}` 
        });
    }
});

// 2. Initialize App
window.onload = function() {
    ably = new Ably.Realtime(API_KEY);
    channel = ably.channels.get('guess-who-logic');

    setupSubscriptions();
    initGame();
};

function initGame() {
    const board = document.getElementById('game-board');
    if (!board) return;
    
    board.innerHTML = '';
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<img src="${char.file}"><p>${char.name}</p>`;
        
        card.onclick = () => {
            if (!isGuessMode) {
                card.classList.toggle('flipped');
            } else {
                processGuess(char);
            }
        };
        board.appendChild(card);
    });

    mySecret = characters[Math.floor(Math.random() * characters.length)];
    document.getElementById('my-character').innerText = mySecret.name;
    
    // Broadcast your secret so the friend knows what to check against
    channel.publish('syncSecret', { secret: mySecret.name });
}

function setupSubscriptions() {
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
            if (msg.data.winner === 'friend') myScore++; else friendScore++;
            updateScoreUI();
            setTimeout(initGame, 3000);
        }
    });
}

function processGuess(char) {
    const myName = document.getElementById('name-input').value || "Player";
    
    if (char.name === friendSecretName) {
        myScore++;
        channel.publish('chat', { sender: "SYSTEM", text: `CORRECT! ${myName} guessed ${char.name}!` });
        channel.publish('scoreUpdate', { winner: 'me' });
    } else {
        friendScore++;
        channel.publish('chat', { sender: "SYSTEM", text: `WRONG! ${myName} guessed ${char.name}. It was ${friendSecretName}.` });
        channel.publish('scoreUpdate', { winner: 'friend' });
    }
    updateScoreUI();
    toggleGuessMode();
    setTimeout(initGame, 3000);
}

function toggleGuessMode() {
    isGuessMode = !isGuessMode;
    const btn = document.getElementById('guess-mode-btn');
    btn.innerText = isGuessMode ? "CLICK YOUR FINAL ANSWER!" : "OFFICIAL GUESS MODE: OFF";
    btn.classList.toggle('active');
}

function updateScoreUI() {
    document.getElementById('my-score').innerText = myScore;
    document.getElementById('friend-score').innerText = friendScore;
}

function requestReset() {
    channel.publish('chat', { sender: "SYSTEM", text: "New game started!" });
    initGame();
}

function sendMsg() {
    const input = document.getElementById('chat-input');
    const name = document.getElementById('name-input').value;
    if (input.value.trim() !== "") {
        channel.publish('chat', { sender: name, text: input.value });
        addMessage('You: ' + input.value);
        input.value = '';
    }
}

function addMessage(text) {
    const msgBox = document.getElementById('messages');
    const p = document.createElement('p');
    p.innerText = text;
    msgBox.appendChild(p);
    msgBox.scrollTop = msgBox.scrollHeight;
}

// Enter key support
document.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });
