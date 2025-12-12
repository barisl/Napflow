import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Register Service Worker with update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                // New service worker activated, reload page to get fresh content
                window.location.reload();
              }
            });
          }
        });
      })
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

