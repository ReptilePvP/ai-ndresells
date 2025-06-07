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
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log('Generating eBay OAuth token using Client Credentials flow...');
    
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
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
      console.error('eBay OAuth token request failed:', response.status, errorData);
      throw new Error(`eBay authentication failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // Refresh 1 min early
    
    console.log('✓ eBay OAuth token generated successfully');
    
    // Test the new token
    await this.testApiAccess();
    
    return this.accessToken!;
  }

  private async testApiAccess(): Promise<void> {
    try {
      const testUrl = `${this.prodBaseUrl}/item_summary/search?q=test&limit=1`;
      console.log('Testing eBay API access with URL:', testUrl);
      
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('eBay production API access confirmed, sample response:', JSON.stringify(data, null, 2));
      } else {
        const errorData = await response.text();
        console.error('eBay API test failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('eBay API test error:', error);
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
        .filter(item => item.price && parseFloat(item.price!.value) > 0)
        .map(item => parseFloat(item.price!.value))
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

  console.log('✓ eBay production service initialized with OAuth integration');
  const service = new EbayProductionService(clientId, clientSecret);
  
  // Test the service initialization
  service.searchMarketplace('test').then(result => {
    console.log('eBay service initialization test completed:', result.sampleSize > 0 ? 'SUCCESS' : 'NO_DATA');
  }).catch(error => {
    console.error('eBay service initialization test failed:', error.message);
  });
  
  return service;
}