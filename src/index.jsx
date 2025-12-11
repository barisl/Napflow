import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

console.log('🚀 index.jsx loaded');

// Register Service Worker (non-blocking)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('⚠️ SW registration failed: ', registrationError);
      });
  });
}

// Render app
const container = document.getElementById('root');
console.log('📦 Container:', container);

if (!container) {
  console.error('❌ Root container not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; background: white;">ERROR: Root container not found!</div>';
} else {
  try {
    console.log('🎨 Creating root...');
    const root = createRoot(container);
    console.log('🎨 Rendering App...');
    root.render(React.createElement(App));
    console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering app:', error);
    container.innerHTML = `<div style="color: red; padding: 20px; background: white;">ERROR: ${error.message}<br>${error.stack}</div>`;
  }
}

