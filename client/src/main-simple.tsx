import React from "react";
import { createRoot } from "react-dom/client";

function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333' }}>Product Analysis Platform</h1>
      <p style={{ color: '#666' }}>React application loaded successfully</p>
      <button 
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#3B82F6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}
        onClick={() => alert('React is working!')}
      >
        Test Button
      </button>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<SimpleApp />);