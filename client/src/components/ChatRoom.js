import React, { useState, useEffect, useRef } from 'react';

const ChatRoom = () => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    const [userColor, setUserColor] = useState(localStorage.getItem('userColor') || '');
    const [usernameInput, setUsernameInput] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuccess, setUsernameSuccess] = useState('');
    const ws = useRef(null);

    

    useEffect(() => {
        ws.current = new WebSocket('ws://localhost:8080');

        ws.current.onopen = () => {
            console.log('Connected to server');
        };

        ws.current.onmessage = (event) => {
            const messageData = JSON.parse(event.data);

            console.log('Received message:', messageData); 
            
            if (messageData.type === 'notification') {
                setUsername(messageData.user.username);
                setUserColor(messageData.user.userColor);
                localStorage.setItem('username', messageData.user.username);
                localStorage.setItem('userColor', messageData.user.userColor);
                setUsernameSuccess(messageData.text);
                setUsernameError('');
                setUsernameInput('');
            } else if (messageData.type === 'message') {
                setMessages((prevMessages) => [...prevMessages, messageData]);
            } else if (messageData.type === 'error') {
                setUsernameError(messageData.text);
                setUsernameSuccess('');
                setUsernameInput('');
            }
        };

        ws.current.onclose = () => {
            console.log('Disconnected from server');
        };

        return () => {
            ws.current.close();
        };
    }, []);

    const sendMessage = () => {
        if (message.trim() !== '') {
            const messageData = {
                type: 'message',
                text: message,
                user: { username, userColor }
            };

            setMessages((prevMessages) => [...prevMessages, messageData]);
            ws.current.send(JSON.stringify(messageData));
            setMessage('');
        }
    };

    const setUsernameHandler = () => {
        if (usernameInput.trim() !== '') {
            ws.current.send(JSON.stringify({ type: 'setUsername', username: usernameInput }));
            setUsernameInput(''); // Clear username input field
        }
    };

    const renderMessage = (msg, index) => {
        const { user, text, style } = msg;
        const messageStyle = {
            fontStyle: style?.fontStyle || 'normal',
            fontSize: style?.fontSize || 'inherit',
            color: style?.color || 'inherit'
        };

        return (
            <div key={index} className="chat-message">
                <span style={{ color: user.userColor }}>{user.username}</span>: 
                <span style={messageStyle}>{text}</span>
            </div>
        );
    };

    return (
        <div>
            <div className="chat-window">
                {messages.map((msg, index) => renderMessage(msg, index))}
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Choose a username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setUsernameHandler();
                        }
                    }}
                />
                <button onClick={setUsernameHandler}>Set Username</button>
                {usernameError && <p style={{ color: 'red' }}>{usernameError}</p>}
                {usernameSuccess && <p style={{ color: 'green' }}>{usernameSuccess}</p>}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                }}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default ChatRoom;
