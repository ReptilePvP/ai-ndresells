import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface StockXAuthStatus {
  authenticated: boolean;
  needsAuthorization: boolean;
  authUrl?: string;
  error?: string;
}

export function StockXAuth() {
  const [authStatus, setAuthStatus] = useState<StockXAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/stockx/auth/status');
      const status = await response.json();
      setAuthStatus(status);
    } catch (error) {
      console.error('Failed to check StockX auth status:', error);
      setAuthStatus({
        authenticated: false,
        needsAuthorization: true,
        error: 'Failed to check authentication status'
      });
    } finally {
      setLoading(false);
    }
  };

  const startAuthorization = async () => {
    try {
      setAuthorizing(true);
      const response = await fetch('/api/auth/stockx/authorize');
      const data = await response.json();
      
      if (data.authUrl) {
        // Open authorization URL in new window
        window.open(data.authUrl, 'stockx-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
        
        // Listen for completion
        const checkComplete = setInterval(async () => {
          await checkAuthStatus();
          if (authStatus?.authenticated) {
            clearInterval(checkComplete);
            setAuthorizing(false);
          }
        }, 2000);
        
        // Stop checking after 5 minutes
        setTimeout(() => {
          clearInterval(checkComplete);
          setAuthorizing(false);
        }, 300000);
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      console.error('Failed to start authorization:', error);
      setAuthorizing(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Check for auth completion from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const stockxAuth = urlParams.get('stockx_auth');
    
    if (stockxAuth === 'success') {
      setTimeout(checkAuthStatus, 1000);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (stockxAuth === 'error') {
      const message = urlParams.get('message');
      setAuthStatus({
        authenticated: false,
        needsAuthorization: true,
        error: message || 'Authentication failed'
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking StockX authentication...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          StockX Integration
          {authStatus?.authenticated ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-500" />
          )}
        </CardTitle>
        <CardDescription>
          Connect your StockX account to access authentic marketplace pricing data for sneakers and streetwear.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authStatus?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authStatus.error}</AlertDescription>
          </Alert>
        )}
        
        {authStatus?.authenticated ? (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                StockX account successfully connected! You now have access to authentic marketplace pricing data.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={checkAuthStatus}>
              Refresh Status
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To access StockX pricing data, you need to authorize this application with your StockX account. 
              This will allow the app to fetch real-time marketplace prices for accurate analysis.
            </p>
            
            <Button 
              onClick={startAuthorization} 
              disabled={authorizing}
              className="w-full"
            >
              {authorizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Authorizing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect StockX Account
                </>
              )}
            </Button>
            
            {authorizing && (
              <Alert>
                <AlertDescription>
                  Please complete the authorization in the popup window. This page will automatically update when complete.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}