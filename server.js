const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let clients = [];
let usedUsernames = new Set();

const getRandomColor = () => {
    const getRandomHexDigit = () => {
        const hexDigits = '0123456789ABCDEF';
        return hexDigits[Math.floor(Math.random() * hexDigits.length)];
    };

    let color = '#';

    // not red (#e74c3c) bc server color 
    do {
        color = '#';
        for (let i = 0; i < 6; i++) {
            color += getRandomHexDigit();
        }
    } while (color === '#e74c3c');

    return color;
};

const generateUniqueUsername = () => {
    let username;
    do {
        username = `User${Math.floor(Math.random() * 10000)}`;
    } while (usedUsernames.has(username) || username.toLowerCase() === 'server' || username.length > 24); // Added length check
    usedUsernames.add(username);
    return username;
};

wss.on('connection', (ws) => {
    console.log('New client connected');

    const sessionId = uuidv4();
    const username = generateUniqueUsername();
    const userColor = getRandomColor();

    const client = { ws, username, userColor, sessionId };
    clients.push(client);

    const broadcastServerMessage = (message, sender) => {
        const messageData = {
            type: 'message',
            text: message,
            user: sender,
            timestamp: new Date().toISOString(),
            style: {
                fontStyle: 'italic',
                fontSize: 'smaller',
                color: '' 
            }
        };
    
        // TODO: not working 
        messageData.style.color = sender.userColor === 'red' ? 'red' : 'yellow';
    
        console.log('Server broadcasting message:', messageData);
    
        clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(messageData));
            }
        });
    };
    
    
    const broadcastMessage = (message, sender) => {
        const messageData = {
            type: 'message',
            text: message,
            user: sender,
            timestamp: new Date().toISOString()
        };
    
        clients.forEach((client) => {
            if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(messageData));
            }
        });
    };

    ws.send(JSON.stringify({ type: 'notification', text: `Welcome, ${username}!`, user: { username, userColor } }));
    broadcastServerMessage(`${username} has joined the chat`, { username: 'Server', userColor: 'red' });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'setUsername') {
                const newUsername = data.username.trim();
                if (newUsername === '' || newUsername.length > 24) { // Check length here
                    ws.send(JSON.stringify({ type: 'error', text: 'Username must be between 1 and 24 characters.' }));
                } else if (usedUsernames.has(newUsername) || newUsername.toLowerCase() === 'server') {
                    ws.send(JSON.stringify({ type: 'error', text: 'Username is already taken or invalid.' }));
                } else {
                    const oldUsername = client.username;
                    usedUsernames.delete(oldUsername);
                    usedUsernames.add(newUsername);
                    client.username = newUsername;
                    ws.send(JSON.stringify({ type: 'notification', text: `Username changed to ${newUsername}`, user: { username: newUsername, userColor } }));
                    broadcastServerMessage(`${oldUsername} has changed their name to ${newUsername}`, { username: 'Server', userColor: 'red' });
                }
            } else if (data.type === 'message') {
                let censoredMessage = data.text;
                bannedWords.forEach(word => {
                    censoredMessage = censoredMessage.replace(new RegExp(word, 'gi'), '****'); // Replace banned words with asterisks
                });
    
                broadcastMessage(censoredMessage, { username: client.username, userColor: client.userColor });
            }
        } catch (error) {
            console.error('Invalid JSON received:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client ${username} disconnected`);
        clients = clients.filter((client) => client.ws !== ws);
        usedUsernames.delete(client.username);
        broadcastServerMessage(`${username} has left the chat`, { username: 'Server', userColor: 'red' });
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
