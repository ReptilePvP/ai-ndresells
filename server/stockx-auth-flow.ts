interface StockXAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

interface StockXTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export class StockXAuthFlow {
  private readonly authUrl = 'https://accounts.stockx.com/authorize';
  private readonly tokenUrl = 'https://accounts.stockx.com/oauth/token';
  private readonly apiBaseUrl = 'https://gateway.stockx.com/api/v1';
  
  private config: StockXAuthConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string) {
    this.config = {
      clientId,
      clientSecret,
      redirectUri: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/auth/stockx/callback`,
      scope: ['read:products', 'read:market_data']
    };
    
    console.log('StockX Auth Flow initialized with redirect URI:', this.config.redirectUri);
  }

  // Step 1: Generate authorization URL for user consent
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope.join(' '),
      state: state || this.generateState()
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  // Step 2: Exchange authorization code for access token
  async exchangeCodeForToken(authorizationCode: string): Promise<StockXTokenResponse> {
    try {
      console.log('Exchanging authorization code for access token...');
      
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: this.config.redirectUri
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`StockX token exchange failed: ${response.status}`, errorText);
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const tokenData: StockXTokenResponse = await response.json();
      
      // Store tokens
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || null;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer

      console.log('✓ StockX access token obtained successfully');
      return tokenData;
    } catch (error) {
      console.error('StockX token exchange error:', error);
      throw error;
    }
  }

  // Step 3: Refresh access token when needed
  async refreshAccessToken(): Promise<StockXTokenResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available - user needs to re-authorize');
    }

    try {
      console.log('Refreshing StockX access token...');
      
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`StockX token refresh failed: ${response.status}`, errorText);
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const tokenData: StockXTokenResponse = await response.json();
      
      // Update tokens
      this.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        this.refreshToken = tokenData.refresh_token;
      }
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000;

      console.log('✓ StockX access token refreshed successfully');
      return tokenData;
    } catch (error) {
      console.error('StockX token refresh error:', error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string> {
    // Check if current token is valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Try to refresh if we have a refresh token
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return this.accessToken!;
      } catch (error) {
        console.warn('Token refresh failed, user needs to re-authorize');
        throw new Error('Authentication expired - user re-authorization required');
      }
    }

    throw new Error('No valid access token - user authorization required');
  }

  // Make authenticated API requests
  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const token = await this.getValidAccessToken();
      
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired, clear it and throw auth error
          this.accessToken = null;
          throw new Error('Authentication expired - user re-authorization required');
        }
        
        const errorText = await response.text();
        console.error(`StockX API error: ${response.status}`, errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StockX authenticated request failed:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry;
  }

  // Get authentication status
  getAuthStatus(): { authenticated: boolean; needsAuthorization: boolean; authUrl?: string } {
    if (this.isAuthenticated()) {
      return { authenticated: true, needsAuthorization: false };
    }

    return {
      authenticated: false,
      needsAuthorization: true,
      authUrl: this.getAuthorizationUrl()
    };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Clear authentication data
  clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
  }
}

export function createStockXAuthFlow(): StockXAuthFlow | null {
  const clientId = process.env.STOCKX_CLIENT_ID;
  const clientSecret = process.env.STOCKX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('StockX OAuth credentials not configured');
    return null;
  }

  return new StockXAuthFlow(clientId, clientSecret);
}