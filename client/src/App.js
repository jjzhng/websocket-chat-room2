import React from 'react';
import ChatRoom from './components/ChatRoom';
import './App.css';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>WebSocket Chat Room</h1>
            </header>
            <ChatRoom />
        </div>
    );
}

export default App;

