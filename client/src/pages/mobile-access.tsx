import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Wifi, RefreshCw, Camera, BarChart3, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MobileAccess() {
  const [serverUrl, setServerUrl] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [localIP, setLocalIP] = useState('');

  useEffect(() => {
    detectServerUrl();
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const detectServerUrl = () => {
    // Get current host and port
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port || '5000';
    
    // For mobile access, we need the actual IP address
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Try to get local network IP
      fetch('/api/auth/me')
        .then(() => {
          // If we can reach the API, construct the mobile URL
          const mobileUrl = `http://${hostname === 'localhost' ? '172.31.128.65' : hostname}:${port}`;
          setServerUrl(mobileUrl);
          setLocalIP('172.31.128.65');
        })
        .catch(() => {
          setServerUrl(`${protocol}//${hostname}:${port}`);
        });
    } else {
      setServerUrl(`${protocol}//${hostname}:${port}`);
      setLocalIP(hostname);
    }
  };

  const checkServerStatus = () => {
    fetch('/api/auth/me')
      .then(() => setIsOnline(true))
      .catch(() => setIsOnline(false));
  };

  const refreshQR = () => {
    detectServerUrl();
    checkServerStatus();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Mobile Access</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scan the QR code to access the Product Analysis Platform on your mobile device
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              QR Code Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className={`mb-4 p-3 rounded-lg ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isOnline ? (
                <div className="flex items-center justify-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Server Online - Ready for mobile access
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Server Offline - Check connection
                </div>
              )}
            </div>

            {serverUrl && (
              <div className="bg-white p-6 rounded-lg border mb-4 inline-block">
                <QRCodeSVG
                  value={serverUrl}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
            )}

            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4 font-mono text-sm break-all">
              {serverUrl || 'Detecting server URL...'}
            </div>

            <Button onClick={refreshQR} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh QR Code
            </Button>
          </CardContent>
        </Card>

        {/* Instructions Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Access</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <strong>Open your phone's camera app</strong>
                    <p className="text-gray-600 dark:text-gray-400">Most modern phones can scan QR codes directly</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <strong>Point camera at the QR code</strong>
                    <p className="text-gray-600 dark:text-gray-400">Hold steady until notification appears</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <strong>Tap the notification</strong>
                    <p className="text-gray-600 dark:text-gray-400">Your browser will open the app automatically</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mobile Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-medium">Camera Upload</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Take photos directly</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Search className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-medium">AI Analysis</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Product identification</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="font-medium">Price Estimates</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Real market data</div>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="font-medium">Market Insights</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Trends & analytics</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Alternative Access Methods</h3>
        <div className="text-sm space-y-1">
          <p><strong>Manual URL:</strong> Copy the URL above and paste in your mobile browser</p>
          <p><strong>Same Network:</strong> Ensure your mobile device is on the same WiFi network</p>
          <p><strong>Local IP:</strong> {localIP || 'Detecting...'}</p>
        </div>
      </div>
    </div>
  );
}