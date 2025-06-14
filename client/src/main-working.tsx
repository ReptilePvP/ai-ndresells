import React from "react";
import { createRoot } from "react-dom/client";

// Step 0: Test without CSS to see if Tailwind CSS is causing issues
function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333' }}>Product Analysis Platform</h1>
      <p style={{ color: '#666' }}>Testing without any external dependencies</p>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);