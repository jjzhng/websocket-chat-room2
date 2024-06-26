const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Use UUIDs to generate session IDs

const app = express();
const server = http.createServer(app);

// WebSocket Server setup
const wss = new WebSocket.Server({
    server,
    verifyClient: (info, cb) => {
        cb(true);
    }
});

// Array to store connected clients and usernames
let clients = [];
let usedUsernames = new Set();

// Function to generate a random color (for user identification)
const getRandomColor = () => {
    const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c'];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Function to generate a unique username
const generateUniqueUsername = () => {
    let username;
    do {
        username = `User${Math.floor(Math.random() * 10000)}`;
    } while (usedUsernames.has(username));
    usedUsernames.add(username);
    return username;
};

// WebSocket server event handlers
wss.on('connection', (ws, req) => {
    console.log('New client connected');

    // Generate unique session ID and username
    const sessionId = uuidv4();
    const username = generateUniqueUsername();
    const userColor = getRandomColor();
    
    clients.push({ ws, username, userColor, sessionId });

    // Send a welcome message with user's handle and color
    ws.send(JSON.stringify({ type: 'notification', text: `Welcome, ${username}!`, user: { username, userColor } }));

    // Broadcast message to all clients
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

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            broadcastMessage(data.text, { username, userColor });
        } catch (error) {
            console.error('Invalid JSON received');
        }
    });

    // Handle client disconnects
    ws.on('close', () => {
        console.log(`Client ${username} disconnected`);
        clients = clients.filter((client) => client.ws !== ws);
        usedUsernames.delete(username);
    });
});

// Serve static files (React frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Serve React app on all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

