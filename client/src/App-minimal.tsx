import { useState, useEffect } from "react";

function App() {
  const [status, setStatus] = useState("Loading...");
  const [dbStatus, setDbStatus] = useState("Checking...");

  useEffect(() => {
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        setStatus("Connected");
        setDbStatus(data.database || "Unknown");
      })
      .catch(() => {
        setStatus("Error");
        setDbStatus("Error");
      });
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "2rem", 
      backgroundColor: "#f8fafc",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ 
          fontSize: "2.5rem", 
          fontWeight: "bold", 
          marginBottom: "1rem",
          color: "#1f2937"
        }}>
          ND Resells - AI Product Analysis
        </h1>
        
        <div style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "2rem"
        }}>
          <h2 style={{ marginBottom: "1rem", color: "#374151" }}>System Status</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>Database Status</span>
              <span style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: dbStatus === "Connected" ? "#dcfce7" : "#fecaca",
                color: dbStatus === "Connected" ? "#166534" : "#991b1b"
              }}>
                {dbStatus}
              </span>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>API Status</span>
              <span style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: status === "Connected" ? "#dcfce7" : "#fecaca",
                color: status === "Connected" ? "#166534" : "#991b1b"
              }}>
                {status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          <div style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "0.5rem", color: "#1f2937" }}>Camera Analysis</h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Use your camera to analyze products in real-time
            </p>
            <button style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}>
              Start Camera Analysis
            </button>
          </div>

          <div style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "0.5rem", color: "#1f2937" }}>Upload Image</h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Upload product images for detailed market analysis
            </p>
            <button style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "white",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer"
            }}>
              Choose Image
            </button>
          </div>

          <div style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "0.5rem", color: "#1f2937" }}>Admin Panel</h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              View system diagnostics and manage settings
            </p>
            <button 
              onClick={() => window.location.href = '/admin'}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Open Admin Panel
            </button>
          </div>
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center", color: "#6b7280" }}>
          <p>Database status fix implemented - showing real connectivity status</p>
        </div>
      </div>
    </div>
  );
}

export default App;