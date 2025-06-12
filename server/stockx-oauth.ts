import * as crypto from 'crypto';

interface StockXTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface StockXAuthState {
  state: string;
  codeVerifier: string;
  timestamp: number;
}

export class StockXOAuthService {
  private readonly authUrl = 'https://accounts.stockx.com/authorize';
  private readonly tokenUrl = 'https://accounts.stockx.com/oauth/token';
  private readonly baseApiUrl = 'https://gateway.stockx.com/public/v1';
  
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private authStates = new Map<string, StockXAuthState>();

  constructor() {
    this.clientId = process.env.STOCKX_CLIENT_ID || '';
    this.clientSecret = process.env.STOCKX_CLIENT_SECRET || '';
    this.redirectUri = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/api/auth/stockx/callback`;
    
    console.log('StockX OAuth service initialized with redirect URI:', this.redirectUri);
  }

  generateAuthUrl(): { authUrl: string; state: string } {
    const state = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(128);
    
    // Store auth state
    this.authStates.set(state, {
      state,
      codeVerifier,
      timestamp: Date.now()
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read:catalog read:market_data',
      state: state,
      code_challenge: this.generateCodeChallenge(codeVerifier),
      code_challenge_method: 'S256'
    });

    const authUrl = `${this.authUrl}?${params.toString()}`;
    return { authUrl, state };
  }

  async exchangeCodeForToken(code: string, state: string): Promise<StockXTokenResponse> {
    const authState = this.authStates.get(state);
    if (!authState) {
      throw new Error('Invalid or expired authorization state');
    }

    try {
      console.log('Exchanging authorization code for StockX access token...');
      
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri,
          code_verifier: authState.codeVerifier
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
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000;

      // Clean up auth state
      this.authStates.delete(state);

      console.log('StockX access token obtained successfully');
      return tokenData;
    } catch (error) {
      console.error('StockX token exchange error:', error);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<StockXTokenResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('Refreshing StockX access token...');
      
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
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

      console.log('StockX access token refreshed successfully');
      return tokenData;
    } catch (error) {
      console.error('StockX token refresh error:', error);
      throw error;
    }
  }

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
        console.warn('Token refresh failed, re-authorization required');
        throw new Error('User re-authorization required');
      }
    }

    throw new Error('No valid access token - user authorization required');
  }

  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const token = await this.getValidAccessToken();
      
      const response = await fetch(`${this.baseApiUrl}${endpoint}`, {
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

  isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry;
  }

  getAuthStatus(): { authenticated: boolean; needsAuthorization: boolean; authUrl?: string } {
    if (this.isAuthenticated()) {
      return { authenticated: true, needsAuthorization: false };
    }

    const { authUrl } = this.generateAuthUrl();
    return {
      authenticated: false,
      needsAuthorization: true,
      authUrl
    };
  }

  clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  // Clean up expired auth states
  cleanupExpiredStates(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    const statesToDelete: string[] = [];
    Array.from(this.authStates.entries()).forEach(([state, authState]) => {
      if (now - authState.timestamp > maxAge) {
        statesToDelete.push(state);
      }
    });
    
    statesToDelete.forEach(state => this.authStates.delete(state));
  }
}

export function createStockXOAuthService(): StockXOAuthService | null {
  const clientId = process.env.STOCKX_CLIENT_ID;
  const clientSecret = process.env.STOCKX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('StockX OAuth credentials not configured');
    return null;
  }

  return new StockXOAuthService();
}