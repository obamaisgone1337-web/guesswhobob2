// 1. CONFIGURATION
const IMAGE_EXTENSION = ".jpg";
// I have wrapped the key in double quotes and ensured no spaces or weird characters are outside.
const API_KEY = "LefjYQ.8r1mwQ:ZH_2I7wseILmuGoCOUiOFoJ-XX3zrbK2HTPIDpst20I"; 

// 2. GLOBAL VARIABLES
var ably, channel;
const shapes = ["circle", "moon", "square", "cloud", "triangle"];
const characters = [];
var mySecret = null;
var friendSecretName = "";
var isGuessMode = false;
var myScore = 0;
var friendScore = 0;

// 3. GENERATE THE DATA
// Added "shapes/" to the file path because your images are in that folder!
for (var s = 0; s < shapes.length; s++) {
    for (var i = 1; i <= 5; i++) {
        characters.push({ 
            name: shapes[s].charAt(0).toUpperCase() + shapes[s].slice(1) + " " + i, 
            file: "shapes/" + shapes[s] + i + IMAGE_EXTENSION 
        });
    }
}

// 4. FUNCTIONS (Defined plainly so HTML can see them)
function addMessage(text) {
    var msgBox = document.getElementById("messages");
    if (msgBox) {
        var p = document.createElement("p");
        p.innerText = text;
        msgBox.appendChild(p);
        msgBox.scrollTop = msgBox.scrollHeight;
    }
}

function updateScoreUI() {
    document.getElementById("my-score").innerText = myScore;
    document.getElementById("friend-score").innerText = friendScore;
}

function toggleGuessMode() {
    isGuessMode = !isGuessMode;
    var btn = document.getElementById("guess-mode-btn");
    if (btn) {
        btn.innerText = isGuessMode ? "CLICK YOUR ANSWER!" : "GUESS MODE: OFF";
        btn.classList.toggle("active");
    }
}

function sendMsg() {
    var input = document.getElementById("chat-input");
    var nameInput = document.getElementById("name-input");
    if (input && input.value.trim() !== "") {
        var sender = nameInput ? nameInput.value : "Player";
        channel.publish("chat", { sender: sender, text: input.value });
        addMessage("You: " + input.value);
        input.value = "";
    }
}

function handleOfficialGuess(char) {
    var myName = document.getElementById("name-input").value || "Player";
    if (char.name === friendSecretName) {
        myScore++;
        channel.publish("chat", { sender: "SYSTEM", text: "CORRECT! " + myName + " won!" });
        channel.publish("scoreUpdate", { winner: "me" });
    } else {
        friendScore++;
        channel.publish("chat", { sender: "SYSTEM", text: "WRONG! " + myName + " picked " + char.name + ". It was " + friendSecretName });
        channel.publish("scoreUpdate", { winner: "friend" });
    }
    updateScoreUI();
    toggleGuessMode();
}

function initGame() {
    var board = document.getElementById("game-board");
    if (!board) return;
    board.innerHTML = "";
    characters.forEach(function(char) {
        var card = document.createElement("div");
        card.className = "card";
        card.innerHTML = '<img src="' + char.file + '" style="width:100%; pointer-events:none;"><p>' + char.name + '</p>';
        card.onclick = function() {
            if (!isGuessMode) { card.classList.toggle("flipped"); } 
            else { handleOfficialGuess(char); }
        };
        board.appendChild(card);
    });
    mySecret = characters[Math.floor(Math.random() * characters.length)];
    document.getElementById("my-character").innerText = mySecret.name;
    if (channel) { channel.publish("syncSecret", { secret: mySecret.name }); }
}

function requestReset() { initGame(); }

// 5. INITIALIZE
window.onload = function() {
    try {
        ably = new Ably.Realtime(API_KEY);
        channel = ably.channels.get("guess-who-logic");
        
        channel.subscribe("chat", function(msg) {
            if (msg.connectionId !== ably.connection.id) {
                addMessage(msg.data.sender + ": " + msg.data.text);
            }
        });

        channel.subscribe("syncSecret", function(msg) {
            if (msg.connectionId !== ably.connection.id) {
                friendSecretName = msg.data.secret;
            }
        });

        channel.subscribe("scoreUpdate", function(msg) {
            if (msg.connectionId !== ably.connection.id) {
                if (msg.data.winner === "me") friendScore++; else myScore++;
                updateScoreUI();
                setTimeout(initGame, 3000);
            }
        });

        initGame();
        console.log("Game Loaded Successfully");
    } catch (e) {
        console.error("Ably Error:", e);
    }
};

document.addEventListener("keypress", function(e) { if (e.key === "Enter") sendMsg(); });
