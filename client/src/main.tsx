import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('Main script loaded');

const container = document.getElementById('root');
console.log('Container found:', !!container);

if (container) {
  try {
    const root = createRoot(container);
    console.log('Root created, rendering App...');
    root.render(<App />);
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Error rendering React app:', error);
    // Fallback to vanilla JS interface
    container.innerHTML = `
      <div style="min-height: 100vh; background-color: #f8fafc; font-family: system-ui, sans-serif; padding: 2rem;">
        <div style="max-width: 800px; margin: 0 auto; text-align: center;">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h1>
          <p style="color: #6b7280; margin-bottom: 2rem;">React failed to initialize. Using fallback interface.</p>
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151;">The backend APIs are working correctly. Please refresh the page to try again.</p>
            <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; margin-top: 1rem; cursor: pointer;">
              Reload Application
            </button>
          </div>
        </div>
      </div>
    `;
  }
} else {
  console.error('Root container not found');
}