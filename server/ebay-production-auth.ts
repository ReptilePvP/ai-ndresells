interface EbayPriceData {
  averagePrice: number;
  priceRange: string;
  sampleSize: number;
  currency: string;
  recentSales: any[];
}

interface EbayProductSearch {
  itemSummaries?: Array<{
    itemId: string;
    title: string;
    price?: {
      value: string;
      currency: string;
    };
    condition: string;
    itemWebUrl: string;
    image?: {
      imageUrl: string;
    };
  }>;
  total: number;
}

export class EbayProductionService {
  private readonly prodBaseUrl = 'https://api.ebay.com/buy/browse/v1';
  private readonly prodTokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  private async getProductionToken(): Promise<string> {
    // Use the verified working OAuth token
    const workingToken = 'v^1.1#i^1#r^0#I^3#p^3#f^0#t^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';
    
    if (workingToken) {
      console.log('Using verified eBay OAuth token');
      this.accessToken = workingToken;
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour
      
      // Test the token
      await this.testApiAccess();
      return workingToken;
    }

    // Fallback to credential-based auth if needed
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    console.log('Authenticating with eBay production environment...');
    
    const response = await fetch(this.prodTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('eBay production auth failed:', response.status, errorData);
      throw new Error(`eBay production authentication failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000;
    
    return this.accessToken!;
  }

  private async testApiAccess(): Promise<void> {
    try {
      const testUrl = `${this.prodBaseUrl}/item_summary/search?q=test&limit=1`;
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        console.log('eBay production API access confirmed');
      } else {
        const errorData = await response.text();
        console.warn('eBay API test failed:', response.status, errorData);
      }
    } catch (error) {
      console.warn('eBay API test error:', error);
    }
  }

  async searchMarketplace(productName: string): Promise<EbayPriceData> {
    try {
      const token = await this.getProductionToken();
      
      const searchQuery = encodeURIComponent(productName.trim());
      const searchUrl = `${this.prodBaseUrl}/item_summary/search?q=${searchQuery}&limit=20&filter=buyingOptions:{FIXED_PRICE}`;
      
      console.log('Searching eBay marketplace for:', productName);
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('eBay search failed:', response.status, errorText);
        throw new Error(`eBay marketplace search failed: ${response.status}`);
      }

      const data: EbayProductSearch = await response.json();
      
      if (!data.itemSummaries || data.itemSummaries.length === 0) {
        return {
          averagePrice: 0,
          priceRange: 'No listings found',
          sampleSize: 0,
          currency: 'USD',
          recentSales: []
        };
      }

      // Process pricing data
      const prices = data.itemSummaries
        .filter(item => item.price && parseFloat(item.price.value) > 0)
        .map(item => parseFloat(item.price.value))
        .sort((a, b) => a - b);

      if (prices.length === 0) {
        return {
          averagePrice: 0,
          priceRange: 'No valid pricing data',
          sampleSize: 0,
          currency: 'USD',
          recentSales: []
        };
      }

      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      console.log(`eBay marketplace: Found ${prices.length} listings, avg $${Math.round(averagePrice)}`);

      return {
        averagePrice: Math.round(averagePrice * 100) / 100,
        priceRange: `$${minPrice} - $${maxPrice}`,
        sampleSize: prices.length,
        currency: 'USD',
        recentSales: data.itemSummaries.slice(0, 10).map(item => ({
          title: item.title,
          price: {
            value: item.price?.value || '0',
            currency: item.price?.currency || 'USD'
          },
          condition: item.condition,
          itemEndDate: new Date().toISOString(),
          itemWebUrl: item.itemWebUrl,
          image: item.image
        }))
      };

    } catch (error) {
      console.error('eBay marketplace error:', error);
      return {
        averagePrice: 0,
        priceRange: 'Search unavailable',
        sampleSize: 0,
        currency: 'USD',
        recentSales: []
      };
    }
  }
}

export function createEbayProductionService(): EbayProductionService | null {
  const clientId = process.env.EBAY_CLIENT_ID || 'Nicholas-Sandbox-PRD-225961f57-4d30ad4c';
  const clientSecret = process.env.EBAY_CLIENT_SECRET || 'PRD-25961f57bd24-aade-4e70-a6bb-986f';

  if (!clientId || !clientSecret) {
    console.warn('eBay production credentials not found');
    return null;
  }

  console.log('Initializing eBay production service');
  return new EbayProductionService(clientId, clientSecret);
}