import React, { useState, useRef, useEffect } from 'react';
import './App.css';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stockxStatus, setStockxStatus] = useState('Testing...');
  const [ebayStatus, setEbayStatus] = useState('Testing...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('sessionId', Date.now().toString());

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
      } else {
        const error = await response.json();
        setAnalysisResult({
          productName: 'Analysis Error',
          description: error.message || 'Failed to analyze image',
          averageSalePrice: 'Unavailable',
          resellPrice: 'Unavailable',
          confidence: 'Low'
        });
      }
    } catch (error) {
      setAnalysisResult({
        productName: 'Connection Error',
        description: 'Unable to connect to analysis service',
        averageSalePrice: 'Unavailable',
        resellPrice: 'Unavailable',
        confidence: 'Low'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const testAPIs = async () => {
    // Test StockX API
    try {
      const response = await fetch('/api/stockx/auth/status');
      const data = await response.json();
      setStockxStatus(data.authenticated ? 'Connected' : 'Authentication required');
    } catch (error) {
      setStockxStatus('Connection failed');
    }

    // Test eBay/Server connectivity
    try {
      const response = await fetch('/api/auth/me');
      setEbayStatus(response.ok ? 'Connected' : 'Service unavailable');
    } catch (error) {
      setEbayStatus('Connection failed');
    }
  };

  useEffect(() => {
    console.log('App component mounted');
    testAPIs();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0' }}>
            ND Resells - AI Product Analysis
          </h1>
        </div>
      </header>
      
      <main style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📱</div>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              Upload Product Image
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '2rem' }}>
              Get instant AI-powered pricing analysis and market insights
            </p>
            
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: '0.5rem',
                padding: '3rem',
                marginBottom: '1.5rem',
                backgroundColor: selectedFile ? '#f0f9ff' : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#059669', marginBottom: '0.5rem' }}>
                    Image Selected: {selectedFile.name}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Click "Analyze Product" to get pricing insights
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Drag & drop an image here
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    or click to browse files
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={analyzeImage}
              disabled={!selectedFile || isAnalyzing}
              style={{
                backgroundColor: selectedFile && !isAnalyzing ? '#3b82f6' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: selectedFile && !isAnalyzing ? 'pointer' : 'not-allowed',
                marginBottom: '2rem'
              }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Product'}
            </button>
          </div>
          
          {analysisResult && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>Product Analysis Complete</h3>
                <p style={{ margin: '0', opacity: '0.9' }}>AI-powered pricing insights from real marketplace data</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>Product Name</div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>{analysisResult.productName}</div>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>Recommended Price</div>
                  <div style={{ fontWeight: '600', color: '#059669', fontSize: '1.125rem' }}>{analysisResult.resellPrice}</div>
                </div>
              </div>
              
              <div style={{ backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: '0.5rem', borderLeft: '4px solid #f59e0b', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>Market Analysis</div>
                <div style={{ color: '#92400e', fontSize: '0.875rem', lineHeight: '1.5' }}>{analysisResult.description}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>Average Sale Price</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>{analysisResult.averageSalePrice}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>Confidence</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb' }}>{analysisResult.confidence || 'High'}</div>
                </div>
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>API Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>StockX API</div>
                <div style={{ fontSize: '0.875rem', color: stockxStatus.includes('Connected') ? '#059669' : '#dc2626' }}>
                  Status: {stockxStatus}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>eBay API</div>
                <div style={{ fontSize: '0.875rem', color: ebayStatus.includes('Connected') ? '#059669' : '#dc2626' }}>
                  Status: {ebayStatus}
                </div>
              </div>
            </div>
            <button
              onClick={testAPIs}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Test APIs
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}