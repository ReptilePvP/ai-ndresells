interface StockXProduct {
  id: string;
  name: string;
  brand: string;
  colorway: string;
  retailPrice: number;
  market: {
    averagePrice: number;
    lowestAsk: number;
    highestBid: number;
    lastSale: number;
    salesLast72Hours: number;
    changeValue: number;
    changePercentage: number;
  };
  deadstock: boolean;
  category: string;
  releaseDate: string;
  image: string;
}

interface StockXSearchResult {
  products: StockXProduct[];
  total: number;
  page: number;
  limit: number;
}

interface StockXPriceData {
  productName: string;
  retailPrice: number;
  currentBid: number;
  currentAsk: number;
  lastSale: number;
  averagePrice: number;
  priceRange: string;
  marketTrend: 'rising' | 'falling' | 'stable';
  salesVolume: number;
  premiumPercentage: number;
  currency: string;
  dataSource: string;
}

export class StockXApiService {
  private readonly baseUrl = 'https://stockx.com/api';
  private readonly publicUrl = 'https://stockx.com/en-us/api/browse';
  private readonly searchUrl = 'https://stockx.com/api/browse';
  private apiKey: string | null = null;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STOCKX_API_KEY || null;
    
    if (this.apiKey) {
      console.log('✓ StockX API service initialized with authentication');
    } else {
      console.log('⚠ StockX API service initialized without authentication - using public endpoints');
    }
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`StockX API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StockX API request failed:', error);
      throw error;
    }
  }

  private async searchProducts(query: string): Promise<StockXSearchResult> {
    try {
      // Use public search endpoint
      const searchQuery = encodeURIComponent(query);
      const url = `${this.publicUrl}?_search=${searchQuery}&limit=20`;
      
      console.log(`StockX search: ${query}`);
      
      const data = await this.makeRequest(url);
      
      if (data && data.Products) {
        return {
          products: data.Products.map((product: any) => this.mapProduct(product)),
          total: data.Products.length,
          page: 1,
          limit: 20
        };
      }
      
      return { products: [], total: 0, page: 1, limit: 20 };
    } catch (error) {
      console.error('StockX search error:', error);
      return { products: [], total: 0, page: 1, limit: 20 };
    }
  }

  private mapProduct(rawProduct: any): StockXProduct {
    const market = rawProduct.market || {};
    
    return {
      id: rawProduct.id || rawProduct.uuid || '',
      name: rawProduct.title || rawProduct.name || '',
      brand: rawProduct.brand || '',
      colorway: rawProduct.colorway || '',
      retailPrice: rawProduct.retailPrice || 0,
      market: {
        averagePrice: market.averagePrice || market.lastSale || 0,
        lowestAsk: market.lowestAsk || 0,
        highestBid: market.highestBid || 0,
        lastSale: market.lastSale || 0,
        salesLast72Hours: market.salesLast72Hours || 0,
        changeValue: market.changeValue || 0,
        changePercentage: market.changePercentage || 0
      },
      deadstock: rawProduct.deadstock || false,
      category: rawProduct.productCategory || '',
      releaseDate: rawProduct.releaseDate || '',
      image: rawProduct.media?.imageUrl || rawProduct.image || ''
    };
  }

  async getProductPricing(productName: string): Promise<StockXPriceData | null> {
    try {
      const searchResult = await this.searchProducts(productName);
      
      if (searchResult.products.length === 0) {
        console.log(`No StockX products found for: ${productName}`);
        return null;
      }

      // Find best match (prioritize exact matches, then brand matches)
      const bestMatch = this.findBestMatch(productName, searchResult.products);
      
      if (!bestMatch) {
        return null;
      }

      const market = bestMatch.market;
      const retailPrice = bestMatch.retailPrice || 0;
      
      // Calculate market metrics
      const currentPrice = market.lastSale || market.averagePrice || 0;
      const premiumPercentage = retailPrice > 0 ? 
        Math.round(((currentPrice - retailPrice) / retailPrice) * 100) : 0;
      
      // Determine market trend
      let marketTrend: 'rising' | 'falling' | 'stable' = 'stable';
      if (market.changePercentage > 5) {
        marketTrend = 'rising';
      } else if (market.changePercentage < -5) {
        marketTrend = 'falling';
      }

      // Generate price range based on bid/ask spread
      let priceRange = '';
      if (market.highestBid > 0 && market.lowestAsk > 0) {
        priceRange = `$${market.highestBid} - $${market.lowestAsk}`;
      } else if (currentPrice > 0) {
        const lower = Math.round(currentPrice * 0.85);
        const upper = Math.round(currentPrice * 1.15);
        priceRange = `$${lower} - $${upper}`;
      }

      return {
        productName: bestMatch.name,
        retailPrice: retailPrice,
        currentBid: market.highestBid || 0,
        currentAsk: market.lowestAsk || 0,
        lastSale: market.lastSale || 0,
        averagePrice: currentPrice,
        priceRange: priceRange,
        marketTrend: marketTrend,
        salesVolume: market.salesLast72Hours || 0,
        premiumPercentage: premiumPercentage,
        currency: 'USD',
        dataSource: `StockX ${bestMatch.brand || 'marketplace'}`
      };

    } catch (error) {
      console.error('StockX pricing error:', error);
      return null;
    }
  }

  private findBestMatch(query: string, products: StockXProduct[]): StockXProduct | null {
    if (products.length === 0) return null;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);

    let bestMatch: StockXProduct | null = null;
    let bestScore = 0;

    for (const product of products) {
      const productName = product.name.toLowerCase();
      const brand = product.brand.toLowerCase();
      
      let score = 0;

      // Exact name match
      if (productName === queryLower) {
        score += 100;
      }

      // Partial name match
      const nameWords = productName.split(' ').filter(word => word.length > 2);
      const matchingWords = queryWords.filter(word => 
        nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
      );
      score += (matchingWords.length / queryWords.length) * 50;

      // Brand match
      if (queryWords.some(word => brand.includes(word))) {
        score += 20;
      }

      // Prioritize products with market data
      if (product.market.lastSale > 0 || product.market.averagePrice > 0) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }

    return bestScore > 20 ? bestMatch : null;
  }

  async getMarketAnalysis(productName: string): Promise<{
    found: boolean;
    pricing: StockXPriceData | null;
    recommendations: string[];
  }> {
    const pricing = await this.getProductPricing(productName);
    
    if (!pricing) {
      return {
        found: false,
        pricing: null,
        recommendations: [
          'Product not found on StockX marketplace',
          'Try searching with specific brand and model',
          'Check if item is available on other resale platforms'
        ]
      };
    }

    const recommendations: string[] = [];
    
    // Market analysis and recommendations
    if (pricing.premiumPercentage > 50) {
      recommendations.push(`High resale premium: ${pricing.premiumPercentage}% above retail`);
    } else if (pricing.premiumPercentage < 0) {
      recommendations.push(`Trading below retail: ${Math.abs(pricing.premiumPercentage)}% discount`);
    }

    if (pricing.marketTrend === 'rising') {
      recommendations.push('Market trend: Rising prices - good time to sell');
    } else if (pricing.marketTrend === 'falling') {
      recommendations.push('Market trend: Declining prices - consider timing');
    }

    if (pricing.salesVolume > 10) {
      recommendations.push('High sales volume - liquid market');
    } else if (pricing.salesVolume < 3) {
      recommendations.push('Low sales volume - limited market activity');
    }

    if (pricing.currentBid > 0 && pricing.currentAsk > 0) {
      const spread = ((pricing.currentAsk - pricing.currentBid) / pricing.currentBid) * 100;
      if (spread > 20) {
        recommendations.push('Wide bid-ask spread - market uncertainty');
      }
    }

    return {
      found: true,
      pricing,
      recommendations
    };
  }

  // Test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      const testResult = await this.searchProducts('jordan');
      console.log(`StockX API test: Found ${testResult.products.length} products`);
      return testResult.products.length > 0;
    } catch (error) {
      console.error('StockX API test failed:', error);
      return false;
    }
  }
}

export function createStockXService(): StockXApiService | null {
  try {
    const service = new StockXApiService();
    return service;
  } catch (error) {
    console.error('Failed to create StockX service:', error);
    return null;
  }
}