interface StockXProductData {
  productName: string;
  retailPrice: number;
  currentBid: number;
  currentAsk: number;
  lastSale: number;
  averagePrice: number;
  priceRange: string;
  marketTrend: 'rising' | 'falling' | 'stable';
  salesVolume: number;
  currency: string;
  dataSource: string;
}

export class StockXProductionAPI {
  private readonly apiBaseUrl = 'https://stockx.com/api';
  private readonly authEndpoint = 'https://stockx.com/api/login';
  private apiKey: string | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private sessionToken: string | null = null;
  private userAgent = 'StockX/iOS/5.0.0';

  constructor(apiKey?: string, clientId?: string, clientSecret?: string) {
    this.apiKey = apiKey || process.env.STOCKX_API_KEY || null;
    this.clientId = clientId || process.env.STOCKX_CLIENT_ID || null;
    this.clientSecret = clientSecret || process.env.STOCKX_CLIENT_SECRET || null;
    
    console.log('StockX Production API initialized with credentials');
  }

  private async authenticateWithCredentials(): Promise<string> {
    try {
      console.log('Authenticating with StockX using production API method...');
      
      // Try direct API authentication using provided credentials
      const authResponse = await fetch(`${this.apiBaseUrl}/portfolio`, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Client-Id': this.clientId || '',
          'X-Client-Secret': this.clientSecret || ''
        }
      });

      if (authResponse.ok) {
        console.log('StockX direct API authentication successful');
        return this.apiKey || '';
      }

      // If direct auth fails, try session-based authentication
      return await this.createAuthenticatedSession();
    } catch (error) {
      console.error('StockX authentication failed:', error);
      throw new Error('Unable to authenticate with StockX API');
    }
  }

  private async createAuthenticatedSession(): Promise<string> {
    try {
      console.log('Creating authenticated StockX session...');
      
      const sessionResponse = await fetch(this.authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          clientId: this.clientId,
          clientSecret: this.clientSecret
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Session creation failed: ${sessionResponse.status}`);
      }

      const sessionData = await sessionResponse.json();
      this.sessionToken = sessionData.token || sessionData.access_token;
      
      console.log('StockX session created successfully');
      return this.sessionToken || '';
    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<StockXProductData | null> {
    try {
      const token = await this.authenticateWithCredentials();
      
      const searchEndpoints = [
        `/browse?_search=${encodeURIComponent(query)}`,
        `/search?s=${encodeURIComponent(query)}`,
        `/products/search?query=${encodeURIComponent(query)}`
      ];

      for (const endpoint of searchEndpoints) {
        try {
          const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'User-Agent': this.userAgent,
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          if (response.ok) {
            const data = await response.json();
            return this.parseProductData(data, query);
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed, trying next...`);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('StockX product search failed:', error);
      return null;
    }
  }

  private parseProductData(data: any, query: string): StockXProductData | null {
    try {
      // Handle different response formats from StockX API
      let products = data.Products || data.products || data.data || [];
      
      if (!Array.isArray(products) && data.edges) {
        products = data.edges.map((edge: any) => edge.node);
      }

      if (products.length === 0) {
        return null;
      }

      const product = products[0];
      const market = product.market || {};
      
      return {
        productName: product.title || product.name || query,
        retailPrice: product.retailPrice || market.retailPrice || 0,
        currentBid: market.highestBid || market.currentBid || 0,
        currentAsk: market.lowestAsk || market.currentAsk || 0,
        lastSale: market.lastSale || market.lastSalePrice || 0,
        averagePrice: market.averagePrice || market.lastSale || 0,
        priceRange: this.calculatePriceRange(market),
        marketTrend: this.determineTrend(market.changePercentage || 0),
        salesVolume: market.salesLast72Hours || market.salesVolume || 0,
        currency: 'USD',
        dataSource: 'StockX Production API'
      };
    } catch (error) {
      console.error('Error parsing StockX product data:', error);
      return null;
    }
  }

  private calculatePriceRange(market: any): string {
    const low = market.highestBid || market.lowestAsk * 0.9 || 0;
    const high = market.lowestAsk || market.highestBid * 1.1 || 0;
    
    if (low > 0 && high > 0) {
      return `$${Math.round(low)} - $${Math.round(high)}`;
    }
    
    return 'N/A';
  }

  private determineTrend(changePercentage: number): 'rising' | 'falling' | 'stable' {
    if (changePercentage > 5) return 'rising';
    if (changePercentage < -5) return 'falling';
    return 'stable';
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing StockX Production API connection...');
      const result = await this.searchProducts('jordan');
      const isConnected = result !== null;
      
      console.log(`StockX Production API test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      return isConnected;
    } catch (error) {
      console.error('StockX Production API test failed:', error);
      return false;
    }
  }

  getAuthenticationStatus(): { authenticated: boolean; method: string; available: boolean } {
    return {
      authenticated: this.sessionToken !== null || this.apiKey !== null,
      method: this.sessionToken ? 'session' : this.apiKey ? 'api_key' : 'none',
      available: !!(this.apiKey && this.clientId && this.clientSecret)
    };
  }
}

export function createStockXProductionAPI(): StockXProductionAPI | null {
  try {
    const service = new StockXProductionAPI();
    return service;
  } catch (error) {
    console.error('Failed to create StockX Production API service:', error);
    return null;
  }
}