import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatRoom from './components/ChatRoom';

const App = () => {
    return (
        <div className="container">
            <ChatRoom />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
} else {
    console.error("Root element not found");
}
