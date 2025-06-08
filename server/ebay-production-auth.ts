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
    // Use the provided long-term token (expires Nov 2026)
    const verifiedToken = 'v^1.1#i^1#p^3#f^0#I^3#r^0#t^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';
    
    // Skip hardcoded token and generate fresh OAuth token
    console.log('Generating fresh eBay OAuth token using Client Credentials...');

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
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope/buy.item.feed'
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
    
    // Test the new token but don't fail if it doesn't work
    try {
      await this.testApiAccess();
    } catch (error) {
      console.log('⚠ eBay token test failed - continuing with limited functionality');
    }
    
    return this.accessToken || '';
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
        this.accessToken = null; // Invalidate token on failure
      }
    } catch (error) {
      console.error('eBay API test error:', error);
      this.accessToken = null; // Invalidate token on error
    }
  }

  private generateSearchTerms(productName: string): string[] {
    const terms: string[] = [];
    
    // Original full name
    terms.push(productName);
    
    // Extract brand and key terms
    const words = productName.toLowerCase().split(/[\s\-:]+/);
    const brand = words.find(w => ['skechers', 'nike', 'adidas', 'jordan', 'yeezy'].includes(w)) || words[0];
    
    // Brand + core product terms
    if (brand) {
      const coreTerms = words.filter(w => 
        !['x', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(w) &&
        w !== brand
      );
      
      if (coreTerms.length > 0) {
        terms.push(`${brand} ${coreTerms.slice(0, 3).join(' ')}`);
        terms.push(`${brand} ${coreTerms[0]}`);
      }
    }
    
    // Extract quoted terms and special collections
    const quotedMatch = productName.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      terms.push(quotedMatch[1]);
    }
    
    // Special collections (BAYC, etc.)
    if (productName.toLowerCase().includes('bored ape')) {
      terms.push('bored ape yacht club');
      terms.push('bayc');
    }
    
    return terms.slice(0, 4); // Limit to 4 search attempts
  }

  async searchMarketplace(productName: string): Promise<EbayPriceData> {
    try {
      const token = await this.getProductionToken();
      const searchTerms = this.generateSearchTerms(productName);
      
      for (const searchTerm of searchTerms) {
        console.log(`Trying eBay search: "${searchTerm}"`);
        
        const searchQuery = encodeURIComponent(searchTerm.trim());
        const searchUrl = `${this.prodBaseUrl}/item_summary/search?q=${searchQuery}&limit=20&filter=buyingOptions:{FIXED_PRICE}`;
        
        const result = await this.performSearch(searchUrl, token);
        if (result.sampleSize > 0) {
          console.log(`eBay success: Found ${result.sampleSize} listings for "${searchTerm}"`);
          return result;
        }
      }
      
      console.log('No eBay listings found for any search variation');
      return {
        averagePrice: 0,
        priceRange: 'No listings found',
        sampleSize: 0,
        currency: 'USD',
        recentSales: []
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

  private async performSearch(searchUrl: string, token: string): Promise<EbayPriceData> {
    try {
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
      console.error('eBay search error:', error);
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
  const clientId = process.env.EBAY_APP_ID || 'Nicholas-Sandbox-PRD-225961f57-4d30ad4c';
  const clientSecret = process.env.EBAY_CERT_ID || 'PRD-25961f57bd24-aade-4e70-a6bb-986f';

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