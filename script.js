const IMAGE_EXTENSION = '.jpg'; 
const API_KEY = 'LefjYQ.8r1mwQ:ZH_2I7wseILmuGoCOUiOFoJ-XX3zrbK2HTPIDpst20I'; // <--- PUT YOUR KEY HERE

const ably = new Ably.Realtime(API_KEY);
const channel = ably.channels.get('guess-who-logic');

const shapes = ['circle', 'moon', 'square', 'cloud', 'triangle'];
const characters = [];

// 1. Generate the 25 image names
shapes.forEach(shape => {
    for (let i = 1; i <= 5; i++) {
        characters.push({
            name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${i}`,
            fileName: `${shape}${i}${IMAGE_EXTENSION}`
        });
    }
});

const board = document.getElementById('game-board');
const msgBox = document.getElementById('messages');
const input = document.getElementById('chat-input');

// 2. Setup the Board
characters.forEach(char => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<img src="${char.fileName}"><p>${char.name}</p>`;
    card.onclick = () => card.classList.toggle('flipped');
    board.appendChild(card);
});

// 3. Pick your secret character
const mySecret = characters[Math.floor(Math.random() * characters.length)];
document.getElementById('my-character').innerText = mySecret.name;

// 4. Multiplayer Functions
function sendMsg() {
    const text = input.value;
    if (text.trim() !== "") {
        channel.publish('chat', { sender: 'Friend', text: text });
        addMessage('You: ' + text);
        input.value = '';
    }
}

// Listen for messages from your friend
channel.subscribe('chat', (msg) => {
    // Only show if the message isn't from us
    if (msg.connectionId !== ably.connection.id) {
        addMessage('Friend: ' + msg.data.text);
    }
});

function addMessage(text) {
    const p = document.createElement('p');
    p.innerText = text;
    msgBox.appendChild(p);
    msgBox.scrollTop = msgBox.scrollHeight; // Auto-scrolls to bottom
}

// Allow pressing "Enter" to send
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMsg();
});
