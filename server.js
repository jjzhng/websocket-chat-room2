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
    const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const generateUniqueUsername = () => {
    let username;
    do {
        username = `User${Math.floor(Math.random() * 10000)}`;
    } while (usedUsernames.has(username) || username.toLowerCase() === 'server');
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

    ws.send(JSON.stringify({ type: 'notification', text: `Welcome, ${username}!`, user: { username, userColor } }));

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

    const broadcastServerMessage = (message, sender) => {
        const messageData = {
            type: 'message',
            text: message,
            user: sender,
            timestamp: new Date().toISOString(),
            style: {
                fontStyle: 'italic',
                fontSize: 'smaller',
                color: 'red'
            }
        };
        console.log('Server broadcasting message:', messageData); 

        clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(messageData));
            }
        });
    };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'setUsername') {
                const newUsername = data.username.trim();
                if (newUsername === '' || usedUsernames.has(newUsername) || newUsername.toLowerCase() === 'server') {
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
                broadcastMessage(data.text, { username: client.username, userColor: client.userColor });
            }
        } catch (error) {
            console.error('Invalid JSON received:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client ${username} disconnected`);
        clients = clients.filter((client) => client.ws !== ws);
        usedUsernames.delete(client.username);
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
