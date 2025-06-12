import { useState, useEffect } from "react";

interface SystemStatus {
  database: string;
  server: string;
}

function App() {
  const [status, setStatus] = useState<SystemStatus>({
    database: 'Checking...',
    server: 'Checking...'
  });

  useEffect(() => {
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        setStatus({
          database: data.database || 'Unknown',
          server: data.server || 'Unknown'
        });
      })
      .catch(() => {
        setStatus({ database: 'Error', server: 'Error' });
      });
  }, []);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
    fontFamily: 'Inter, system-ui, sans-serif'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    margin: '0 auto',
    maxWidth: '1200px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.5rem',
    textAlign: 'center'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '3rem'
  };

  const statusGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem'
  };

  const statusItemStyle: React.CSSProperties = {
    background: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0'
  };

  const getBadgeStyle = (status: string): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    background: status === 'Connected' ? '#dcfce7' : '#fecaca',
    color: status === 'Connected' ? '#166534' : '#991b1b'
  });

  const featureGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem'
  };

  const featureCardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '1rem 1.5rem',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  };

  const openAdmin = () => {
    window.open('/admin', '_blank');
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>ND Resells</h1>
        <p style={subtitleStyle}>AI Product Analysis & Pricing Platform</p>
        
        <div style={statusGridStyle}>
          <div style={statusItemStyle}>
            <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Database Status</span>
            <span style={getBadgeStyle(status.database)}>{status.database}</span>
          </div>
          <div style={statusItemStyle}>
            <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>API Server</span>
            <span style={getBadgeStyle(status.server)}>{status.server}</span>
          </div>
        </div>

        <div style={featureGridStyle}>
          <div style={featureCardStyle}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1f2937' }}>
              Camera Analysis
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Use your camera to analyze products in real-time with AI-powered recognition
            </p>
            <button style={buttonStyle}>Start Camera Analysis</button>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1f2937' }}>
              Upload Image
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Upload product images for detailed market analysis and pricing insights
            </p>
            <button style={{...buttonStyle, background: '#6366f1'}}>Choose Image</button>
          </div>

          <div style={featureCardStyle}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1f2937' }}>
              Admin Panel
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              View system diagnostics, manage settings, and monitor API connections
            </p>
            <button style={{...buttonStyle, background: '#059669'}} onClick={openAdmin}>
              Open Admin Panel
            </button>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem', 
          padding: '1rem',
          background: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <p style={{ color: '#166534', fontWeight: '500' }}>
            Database status fix implemented - showing real connectivity status
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;