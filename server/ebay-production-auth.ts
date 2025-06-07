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
    const verifiedToken = 'v^1.1#i^1#I^3#f^0#r^0#p^1#t^H4sIAAAAAAAA/+VYa2wUVRTe3bZghYJEXiLGdQpRMDN7Z3b2NXaXbF90adk+dsujBPHuzJ126O7MMvcO3fKHUgyixBhAMCg/KsEEJUSNopEgRqLEKAZJ1BAjxMaYYIIaRagaNM5sl7KtBJBu4ibun82ce+653/edc+69M6BvQvnCLQ1bhirsEx0DfaDPYbezk0D5hLKHp5Q45pTZQJ6DfaBvXl9pf8n5KgxTybTQhnBaUzFyZlJJFQtZY5AydFXQIFawoMIUwgIRhVh4aZPAMUBI6xrRRC1JOSO1QQrysoyQxx8QEeBlL2ta1asx41qQQjxCPJ9gIR+AXl5G5jjGBoqomECVBCkOcB4aeGngiwOfwHMC72N8vLeDci5DOlY01XRhABXKwhWyc/U8rDeGCjFGOjGDUKFIuD7WHI7U1kXjVa68WKGcDjECiYFHP9VoEnIug0kD3XgZnPUWYoYoIowpV2h4hdFBhfBVMLcBPys1koFPZCV3QvL7gR+BgkhZr+kpSG6Mw7IoEi1nXQWkEoX03kxRU43EWiSS3FPUDBGpdVp/rQZMKrKC9CBVVx1eGW5poUJRRezSkhDTMahKCS1Dt7TV0hznCXhZ2eOjeckNoMSLuXWGg+VUHrNQjaZKiqUZdkY1Uo1M0GisNO48aUynZrVZD8vEApTvFxiR0N1h5XQ4iQbpUq20opSpgzP7ePMEjMwmRFcSBkEjEcYOZBUyuyqdViRq7GC2FHPVk8FBqouQtOBy9fT0MD1uRtM7XRwArGvF0qaY2IVSkLJ8rV7P+is3n0ArWSqi2aWmv0B60yaWjFmqJgC1kwp5OK+PY3O6j4YVGmv9hyGPs2t0QxSqQdySmQCRA14PCEAkFaRBQrkadVk4UAL20imodyOSTkIR0aJZZ0YK6YokuD0y5/bLiJa8AZnmA7JMJzySl2bN7REglEiIAf//qE9utdJjSNQRKUypF6rMG2HLYrWulrR1LO+O8nGxdQPbuB5pOJBpqzYSTW1Gpy6nErA1kGoP3mozXJd8TVIxlYmb6xdfrzdomCBpXPRiopZGLVpSEXuLK8FuXWqBOumNoWTSNIyLZDidjhRoqy4UvX+3S9we7QKeUP/N6XRdVtiq2OJiZc3HZgCYVhjr/GFELeXSoGH1OumyzGuyqMfFWzGvrUXF2iQ5zFaRhu+bjEmZdDF4vcjoCGuGbl61mWbr/hXXupFqHmdE15JJpC8bXwVY7ZxKGQQmkqjY+roABa7AIjtrWR8f4Pwc6/WNi5eYPUnXFNuWVKCduLTmNu7UrtEv+CFb9sf224+Dfvsxh90OqsB8thI8MKGkvbRk8hysEMQoUGaw0qma7606YrpRbxoquuNu26kpTdKmhqZLfQnj7eW/LvLbKvK+LwysBrNHvjCUl7CT8j43gLnXRsrYqbMqOA/wAh/w8Rzv6wCV10ZL2Zml01e+7zhZ9cbB6fWnvn3itW1/zDz76J6toGLEyW4vs5X2222diVXMNveLO/ybth7aPG1qw+rBow2HD+zdv2vVpvPbj9h2bd+33vbplMs/r9v/w+UXHvrmw0XxVw83xtzxS0cuRIXytU9duXDPFydf/r6qovvHz2ddnCx3PinO/uWDwc1dM6fO6MGL46/bFm0+1rFxwbmnGePP4/sO0pGhN99q9jxy5iu+Fx1y3nXhPbxxcGfGFpCi+pONwPHY88sd85nMzsEzC38//e70A6sfDzTtmWvb8Oydx/XMS7uH1h2pfHDok8N/nd1wZdtH9Y33UkuWRFdEvaEZ9537uE4+MK/tuzvY1t8ufsncf/riKwsal1THnhv4+qfde5vtB8XgyvaezyaCk0crg9OeOXFiB9Uef2c4l38DP9VvkPkRAAA=';
    
    if (verifiedToken) {
      console.log('Using verified eBay token (expires Nov 2026)');
      this.accessToken = verifiedToken;
      this.tokenExpiry = new Date('2026-11-29').getTime();
      
      // Test token immediately
      await this.testApiAccess();
      return this.accessToken;
    }

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