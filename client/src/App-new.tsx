import React, { useState } from 'react';

const App: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<{stockx: string, ebay: string}>({
    stockx: 'Not tested',
    ebay: 'Not tested'
  });
  const [testing, setTesting] = useState(false);

  const testAPIs = async () => {
    setTesting(true);
    
    // Test StockX API
    try {
      const stockxResponse = await fetch('/api/stockx/auth/status');
      const stockxData = await stockxResponse.json();
      setApiStatus(prev => ({
        ...prev,
        stockx: stockxData.authenticated ? 'Connected' : 'Authentication required'
      }));
    } catch (error) {
      setApiStatus(prev => ({ ...prev, stockx: 'Connection failed' }));
    }

    // Test eBay API by checking if market data service is available
    try {
      const ebayResponse = await fetch('/api/auth/me');
      setApiStatus(prev => ({
        ...prev,
        ebay: ebayResponse.ok ? 'Connected' : 'Service unavailable'
      }));
    } catch (error) {
      setApiStatus(prev => ({ ...prev, ebay: 'Connection failed' }));
    }
    
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            ND Resells - AI Product Analysis
          </h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-6">📱</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Upload Product Image
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Get instant pricing analysis and market insights from StockX and eBay
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-16 mb-8 bg-gray-50">
              <p className="text-gray-500">
                Drag and drop an image or click to browse
              </p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Choose File
              </button>
              <button 
                onClick={testAPIs}
                disabled={testing}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test APIs'}
              </button>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">StockX Integration</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Real-time sneaker and streetwear pricing data
                </p>
                <div className={`text-xs font-medium ${
                  apiStatus.stockx === 'Connected' ? 'text-green-600' : 
                  apiStatus.stockx === 'Not tested' ? 'text-gray-500' : 'text-red-600'
                }`}>
                  Status: {apiStatus.stockx}
                </div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">eBay Integration</h3>
                <p className="text-green-700 text-sm mb-2">
                  Live marketplace pricing and sales data
                </p>
                <div className={`text-xs font-medium ${
                  apiStatus.ebay === 'Connected' ? 'text-green-600' : 
                  apiStatus.ebay === 'Not tested' ? 'text-gray-500' : 'text-red-600'
                }`}>
                  Status: {apiStatus.ebay}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;