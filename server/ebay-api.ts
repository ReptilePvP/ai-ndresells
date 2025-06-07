interface EbaySearchResult {
  title: string;
  price: {
    value: string;
    currency: string;
  };
  condition: string;
  itemEndDate: string;
  image?: {
    imageUrl: string;
  };
  itemWebUrl: string;
}

interface EbayApiResponse {
  itemSummaries?: EbaySearchResult[];
  total: number;
  next?: string;
}

interface EbayPriceData {
  averagePrice: number;
  priceRange: string;
  sampleSize: number;
  currency: string;
  recentSales: EbaySearchResult[];
}

export class EbayApiService {
  private readonly baseUrl = 'https://api.ebay.com/buy/browse/v1';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope/buy.item.browse'
    });

    if (!response.ok) {
      throw new Error(`eBay token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer
    
    return this.accessToken!;
  }

  async searchSoldListings(productName: string, limit: number = 50): Promise<EbayPriceData> {
    const token = await this.getAccessToken();
    
    // Search for sold/completed listings
    const searchQuery = encodeURIComponent(`${productName} -damaged -broken -parts`);
    const url = `${this.baseUrl}/item_summary/search?q=${searchQuery}&filter=conditionIds:{1000|1500|2000|2500|3000}&filter=buyingOptions:{AUCTION|FIXED_PRICE}&filter=itemEndDate:[2024-01-01T00:00:00.000Z..${new Date().toISOString()}]&limit=${limit}&sort=itemEndDate`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>'
      }
    });

    if (!response.ok) {
      throw new Error(`eBay search failed: ${response.status}`);
    }

    const data: EbayApiResponse = await response.json();
    
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      return {
        averagePrice: 0,
        priceRange: 'No recent sales found',
        sampleSize: 0,
        currency: 'USD',
        recentSales: []
      };
    }

    // Process price data
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
    const currency = data.itemSummaries[0]?.price?.currency || 'USD';

    return {
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceRange: `$${minPrice} - $${maxPrice} ${currency}`,
      sampleSize: prices.length,
      currency,
      recentSales: data.itemSummaries.slice(0, 10) // Keep top 10 for reference
    };
  }

  async searchCurrentListings(productName: string, limit: number = 20): Promise<EbayPriceData> {
    const token = await this.getAccessToken();
    
    // Search for current active listings
    const searchQuery = encodeURIComponent(`${productName} -damaged -broken -parts`);
    const url = `${this.baseUrl}/item_summary/search?q=${searchQuery}&filter=conditionIds:{1000|1500|2000|2500|3000}&filter=buyingOptions:{FIXED_PRICE}&filter=itemLocationCountry:US&limit=${limit}&sort=price`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>'
      }
    });

    if (!response.ok) {
      throw new Error(`eBay current listings search failed: ${response.status}`);
    }

    const data: EbayApiResponse = await response.json();
    
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      return {
        averagePrice: 0,
        priceRange: 'No current listings found',
        sampleSize: 0,
        currency: 'USD',
        recentSales: []
      };
    }

    // Process current listing prices
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
    const currency = data.itemSummaries[0]?.price?.currency || 'USD';

    return {
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceRange: `$${minPrice} - $${maxPrice} ${currency}`,
      sampleSize: prices.length,
      currency,
      recentSales: data.itemSummaries.slice(0, 5) // Keep top 5 for reference
    };
  }

  async getComprehensiveMarketData(productName: string): Promise<{
    soldData: EbayPriceData;
    currentData: EbayPriceData;
    marketInsights: {
      recommendedResellPrice: string;
      demandLevel: string;
      priceVelocity: string;
    };
  }> {
    const [soldData, currentData] = await Promise.all([
      this.searchSoldListings(productName),
      this.searchCurrentListings(productName)
    ]);

    // Calculate market insights
    const soldAvg = soldData.averagePrice;
    const currentAvg = currentData.averagePrice;
    
    let recommendedResellPrice = 'Unable to determine';
    let demandLevel = 'Unknown';
    let priceVelocity = 'Stable';

    if (soldAvg > 0 && currentAvg > 0) {
      // Recommend 10-15% below current market average for quick sale
      const quickSalePrice = currentAvg * 0.85;
      const competitivePrice = currentAvg * 0.90;
      recommendedResellPrice = `$${Math.round(quickSalePrice)} - $${Math.round(competitivePrice)}`;
      
      // Determine demand level based on listing volume
      const totalListings = soldData.sampleSize + currentData.sampleSize;
      if (totalListings > 50) {
        demandLevel = 'High';
      } else if (totalListings > 20) {
        demandLevel = 'Moderate';
      } else {
        demandLevel = 'Low';
      }

      // Price velocity based on sold vs current prices
      const priceRatio = currentAvg / soldAvg;
      if (priceRatio > 1.1) {
        priceVelocity = 'Rising';
      } else if (priceRatio < 0.9) {
        priceVelocity = 'Declining';
      }
    } else if (soldAvg > 0) {
      recommendedResellPrice = `$${Math.round(soldAvg * 0.85)} - $${Math.round(soldAvg * 0.95)}`;
    }

    return {
      soldData,
      currentData,
      marketInsights: {
        recommendedResellPrice,
        demandLevel,
        priceVelocity
      }
    };
  }
}

export function createEbayService(): EbayApiService | null {
  const clientId = process.env.EBAY_CLIENT_ID || 'Nicholas-Sandbox-PRD-225961f57-4d30ad4c';
  const clientSecret = process.env.EBAY_CLIENT_SECRET || 'PRD-25961f57bd24-aade-4e70-a6bb-986f';

  if (!clientId || !clientSecret) {
    console.warn('eBay API credentials not found. Market data will be limited.');
    return null;
  }

  console.log('eBay API service initialized with production credentials');
  return new EbayApiService(clientId, clientSecret);
}