import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Database, Server, Settings } from "lucide-react";

interface SystemStatus {
  database: 'connected' | 'error';
  api: 'running' | 'error';
}

function MainApp() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'error',
    api: 'error'
  });

  useEffect(() => {
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        setSystemStatus({
          database: data.database === 'Connected' ? 'connected' : 'error',
          api: data.server === 'Running' ? 'running' : 'error'
        });
      })
      .catch(() => {
        setSystemStatus({ database: 'error', api: 'error' });
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ND Resells - AI Product Analysis
          </h1>
          <p className="text-lg text-gray-600">
            Advanced marketplace insights powered by AI
          </p>
        </div>

        {/* System Status */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Database</span>
                  </div>
                  <Badge variant={systemStatus.database === 'connected' ? 'default' : 'destructive'}>
                    {systemStatus.database === 'connected' ? 'Connected' : 'Error'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span>API Server</span>
                  </div>
                  <Badge variant={systemStatus.api === 'running' ? 'default' : 'destructive'}>
                    {systemStatus.api === 'running' ? 'Running' : 'Error'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Use your camera to analyze products in real-time
              </p>
              <Button className="w-full">
                Start Camera Analysis
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Upload product images for detailed market analysis
              </p>
              <Button variant="outline" className="w-full">
                Choose Image
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Real-time Pricing</h3>
              <p className="text-sm text-gray-600">
                Get current market prices from multiple platforms
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Product Recognition</h3>
              <p className="text-sm text-gray-600">
                AI-powered product identification and categorization
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Market Insights</h3>
              <p className="text-sm text-gray-600">
                Comprehensive analytics for informed decisions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;