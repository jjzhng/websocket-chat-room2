import React, { useState, useEffect, useRef } from 'react';
import './ChatRoom.css';

const ChatRoom = () => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    const [userColor, setUserColor] = useState(localStorage.getItem('userColor') || '');
    const [usernameInput, setUsernameInput] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuccess, setUsernameSuccess] = useState('');
    const [darkMode, setDarkMode] = useState(getInitialMode()); // should initialise based on time of day (dark = night, light = day)

    const ws = useRef(null);

    const bannedWords = ['blacklist', 'bad', 'nono']; 

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
                scrollToBottom();
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
            let censoredMessage = message;
            bannedWords.forEach(word => {
                censoredMessage = censoredMessage.replace(new RegExp(word, 'gi'), '****'); // Replace banned words with asterisks
            });

            const messageData = {
                type: 'message',
                text: censoredMessage,
                user: { username, userColor },
            };

            setMessages((prevMessages) => [...prevMessages, messageData]);
            ws.current.send(JSON.stringify(messageData));
            setMessage('');
            scrollToBottom();
        }
    };

    const setUsernameHandler = () => {
        if (usernameInput.trim() !== '') {
            ws.current.send(JSON.stringify({ type: 'setUsername', username: usernameInput }));
        }
    };

    const renderMessage = (msg, index) => {
        const { user, text, style } = msg;
        const messageStyle = {
            fontStyle: style?.fontStyle || 'normal',
            fontSize: style?.fontSize || 'inherit',
            color: style?.color || 'inherit',
        };
    
        const messageClass = user.username === 'Server' ? 'server' : '';
    
        return (
            <div key={index} className={`chat-message ${messageClass}`}>
                <span style={{ color: user.userColor }}>{user.username}</span>: <span style={messageStyle}>{text}</span>
            </div>
        );
    };
    
    const scrollToBottom = () => {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    function getInitialMode() {
        const isReturningUser = 'dark' in localStorage;
        const savedMode = JSON.parse(localStorage.getItem('dark'));
        const userPrefersDark = getComputedStyle(document.documentElement).getPropertyValue('--initial-color-mode') === 'dark';

        if (isReturningUser) {
            return savedMode;
        } else if (userPrefersDark) {
            return true;
        } else {
            return false;
        }
    }

    useEffect(() => {
        localStorage.setItem('dark', JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const toggleDarkMode = () => {
        setDarkMode(prevMode => !prevMode);
    };

    return (
        <div className={`container ${darkMode ? 'dark' : ''}`}>
            <div className="header">
                <div className="username-container">
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
                </div>
                {usernameError && <p className="error-message">{usernameError}</p>}
                {usernameSuccess && <p className="success-message">{usernameSuccess}</p>}
                <div>
                    <button className="mode-toggle" onClick={toggleDarkMode}>
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
            </div>

            <div id="chat-window" className="chat-window">
                {messages.map((msg, index) => renderMessage(msg, index))}
            </div>

            <div className="input-container">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            sendMessage();
                        }
                    }}
                    placeholder="Type your message here..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
};

export default ChatRoom;
