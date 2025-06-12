import { useState } from "react";

function App() {
  const [title] = useState("ND Resells - AI Product Analysis");

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f8fafc", 
      padding: "20px",
      fontFamily: "system-ui, sans-serif" 
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <header style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          borderRadius: "8px", 
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "20px"
        }}>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: "bold", 
            color: "#1f2937",
            margin: 0 
          }}>
            {title}
          </h1>
        </header>
        
        <main style={{ 
          backgroundColor: "white", 
          padding: "40px", 
          borderRadius: "8px", 
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>📱</div>
            <h2 style={{ 
              fontSize: "28px", 
              fontWeight: "600", 
              color: "#1f2937",
              marginBottom: "12px" 
            }}>
              Upload Product Image
            </h2>
            <p style={{ 
              fontSize: "16px", 
              color: "#6b7280",
              marginBottom: "30px" 
            }}>
              Get instant pricing analysis and market insights
            </p>
            
            <div style={{ 
              border: "2px dashed #d1d5db", 
              borderRadius: "8px", 
              padding: "60px 20px",
              backgroundColor: "#f9fafb" 
            }}>
              <p style={{ 
                color: "#9ca3af",
                fontSize: "14px",
                margin: 0 
              }}>
                Drag and drop an image or click to browse
              </p>
            </div>
            
            <div style={{ marginTop: "30px" }}>
              <button style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "12px 24px",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                marginRight: "12px"
              }}>
                Choose File
              </button>
              
              <button style={{
                backgroundColor: "#10b981",
                color: "white",
                padding: "12px 24px",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer"
              }}>
                Test StockX API
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;