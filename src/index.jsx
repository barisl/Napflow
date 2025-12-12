import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Register Service Worker (non-blocking)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  });
}

// Render app
const container = document.getElementById('root');

if (!container) {
  console.error('Root container not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; background: white;">ERROR: Root container not found!</div>';
} else {
  try {
    const root = createRoot(container);
    root.render(React.createElement(App));
  } catch (error) {
    console.error('Error rendering app:', error);
    container.innerHTML = `<div style="color: red; padding: 20px; background: white;">ERROR: ${error.message}<br>${error.stack}</div>`;
  }
}

