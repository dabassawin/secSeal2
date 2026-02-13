import React from 'react';
import { createRoot } from 'react-dom/client';

if (typeof global === 'undefined') {
    (window as any).global = window;
}

import App from './src/App';

const rootElement = document.getElementById('root');

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
} else {
    console.error('Root element not found!');
}
