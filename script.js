const IMAGE_EXTENSION = '.jpg';
const API_KEY = LefjYQ.8r1mwQ:ZH_2I7wseILmuGoCOUiOFoJ-XX3zrbK2HTPIDpst20I; 

const ably = new Ably.Realtime(API_KEY);
const channel = ably.channels.get('guess-who-logic');

const shapes = ['circle', 'moon', 'square', 'cloud', 'triangle'];
const characters = [];
let mySecret = null;
let isGuessMode = false;
let myScore = 0;
let friendScore = 0;

// 1. Generate Characters
shapes.forEach(shape => {
    for (let i = 1; i <= 5; i++) {
        characters.push({ name: `${shape} ${i}`, file: `${shape}${i}${IMAGE_EXTENSION}` });
    }
});

function initGame() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<img src="${char.file}" style="width:100%"><p>${char.name}</p>`;
        card.onclick = () => handleCardClick(char, card);
        board.appendChild(card);
    });
    mySecret = characters[Math.floor(Math.random() * characters.length)];
    document.getElementById('my-character').innerText = mySecret.name;
    // Tell the friend what our secret is (privately via channel)
    channel.publish('syncSecret', { secret: mySecret.name });
}

let friendSecretName = "";
channel.subscribe('syncSecret', (msg) => {
    if (msg.connectionId !== ably.connection.id) friendSecretName = msg.data.secret;
});

function handleCardClick(char, cardElement) {
    if (!isGuessMode) {
        cardElement.classList.toggle('flipped');
    } else {
        // OFFICIAL GUESS
        if (char.name === friendSecretName) {
            myScore++;
            channel.publish('chat', { sender: "SYSTEM", text: `CORRECT! ${nameInput.value} guessed it! It was ${char.name}.` });
            channel.publish('scoreUpdate', { winner: 'me' });
        } else {
            friendScore++;
            channel.publish('chat', { sender: "SYSTEM", text: `WRONG! ${nameInput.value} guessed ${char.name}, but it was actually ${friendSecretName}.` });
            channel.publish('scoreUpdate', { winner: 'friend' });
        }
        updateScoreUI();
        toggleGuessMode(); // Turn off guess mode
        setTimeout(initGame, 3000); // Reset after 3 seconds
    }
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

channel.subscribe('scoreUpdate', (msg) => {
    if (msg.connectionId !== ably.connection.id) {
        if (msg.data.winner === 'me') friendScore++; else myScore++;
        updateScoreUI();
        setTimeout(initGame, 3000);
    }
});

function requestReset() { 
    channel.publish('chat', { sender: "SYSTEM", text: "Board reset by player." });
    initGame(); 
}

// --- CHAT LOGIC ---
const nameInput = document.getElementById('name-input');
const input = document.getElementById('chat-input');
const msgBox = document.getElementById('messages');

function sendMsg() {
    if (input.value.trim() !== "") {
        channel.publish('chat', { sender: nameInput.value, text: input.value });
        addMessage(nameInput.value + ': ' + input.value);
        input.value = '';
    }
}

channel.subscribe('chat', (msg) => {
    if (msg.connectionId !== ably.connection.id) addMessage(msg.data.sender + ': ' + msg.data.text);
});

function addMessage(text) {
    const p = document.createElement('p'); p.innerText = text;
    msgBox.appendChild(p);
    msgBox.scrollTop = msgBox.scrollHeight;
}

initGame();
