import { EbayApiService, createEbayService } from './ebay-api';
import { EcommercePlatformService, createEcommerceService } from './ecommerce-platforms';

interface PricingData {
  platform: string;
  currentPrice: number;
  priceRange: string;
  availability: string;
  currency: string;
  condition: string;
  source: string;
  confidence: number;
}

interface ComprehensivePricing {
  product: string;
  retailPrices: PricingData[];
  resellPrices: PricingData[];
  marketSummary: {
    averageRetailPrice: number;
    averageResellPrice: number;
    recommendedResellRange: string;
    profitMargin: string;
    currency: string;
    dataQuality: string;
  };
  lastUpdated: string;
}

export class PricingAggregator {
  private ebayService: EbayApiService | null;
  private ecommerceService: EcommercePlatformService;

  constructor() {
    this.ebayService = createEbayService();
    this.ecommerceService = createEcommerceService();
  }

  async getComprehensivePricing(productName: string): Promise<ComprehensivePricing> {
    console.log(`Aggregating pricing data for: ${productName}`);
    
    const [retailData, resellData] = await Promise.allSettled([
      this.getRetailPricing(productName),
      this.getResellPricing(productName)
    ]);

    const retailPrices: PricingData[] = retailData.status === 'fulfilled' ? retailData.value : [];
    const resellPrices: PricingData[] = resellData.status === 'fulfilled' ? resellData.value : [];

    // Calculate market summary
    const retailAverage = this.calculateAverage(retailPrices);
    const resellAverage = this.calculateAverage(resellPrices);
    
    const recommendedResellRange = this.calculateResellRange(retailAverage, resellAverage);
    const profitMargin = this.calculateProfitMargin(retailAverage, resellAverage);
    const dataQuality = this.assessDataQuality(retailPrices, resellPrices);

    return {
      product: productName,
      retailPrices,
      resellPrices,
      marketSummary: {
        averageRetailPrice: retailAverage,
        averageResellPrice: resellAverage,
        recommendedResellRange,
        profitMargin,
        currency: 'USD',
        dataQuality
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async getRetailPricing(productName: string): Promise<PricingData[]> {
    try {
      const ecommercePricing = await this.ecommerceService.getComprehensivePricing(productName);
      
      return ecommercePricing.platforms.map(platform => ({
        platform: platform.platform,
        currentPrice: platform.currentPrice,
        priceRange: platform.priceRange,
        availability: platform.availability,
        currency: platform.currency,
        condition: platform.condition,
        source: 'Retail',
        confidence: 0.9
      }));
    } catch (error) {
      console.error('Retail pricing error:', error);
      return [];
    }
  }

  private async getResellPricing(productName: string): Promise<PricingData[]> {
    const resellData: PricingData[] = [];

    // eBay resell data
    if (this.ebayService) {
      try {
        const ebayData = await this.ebayService.getComprehensiveMarketData(productName);
        
        if (ebayData.soldData.sampleSize > 0) {
          resellData.push({
            platform: 'eBay',
            currentPrice: ebayData.soldData.averagePrice,
            priceRange: ebayData.soldData.priceRange,
            availability: `${ebayData.soldData.sampleSize} sold recently`,
            currency: ebayData.soldData.currency,
            condition: 'Various',
            source: 'Sold Listings',
            confidence: 0.95
          });
        }

        if (ebayData.currentData.sampleSize > 0) {
          resellData.push({
            platform: 'eBay',
            currentPrice: ebayData.currentData.averagePrice,
            priceRange: ebayData.currentData.priceRange,
            availability: `${ebayData.currentData.sampleSize} active listings`,
            currency: ebayData.currentData.currency,
            condition: 'Various',
            source: 'Active Listings',
            confidence: 0.85
          });
        }
      } catch (error) {
        console.error('eBay resell pricing error:', error);
      }
    }

    return resellData;
  }

  private calculateAverage(prices: PricingData[]): number {
    if (prices.length === 0) return 0;
    
    const weightedSum = prices.reduce((sum, price) => {
      return sum + (price.currentPrice * price.confidence);
    }, 0);
    
    const totalWeight = prices.reduce((sum, price) => sum + price.confidence, 0);
    
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  }

  private calculateResellRange(retailAverage: number, resellAverage: number): string {
    let lowResell: number, highResell: number;

    if (resellAverage > 0) {
      // Use actual resell data with slight adjustment
      lowResell = Math.round(resellAverage * 0.85);
      highResell = Math.round(resellAverage * 1.15);
    } else if (retailAverage > 0) {
      // Estimate from retail pricing
      lowResell = Math.round(retailAverage * 0.60);
      highResell = Math.round(retailAverage * 0.85);
    } else {
      return 'Insufficient data';
    }

    return `$${lowResell} - $${highResell}`;
  }

  private calculateProfitMargin(retailAverage: number, resellAverage: number): string {
    if (retailAverage <= 0 || resellAverage <= 0) {
      return 'Unable to calculate';
    }

    const margin = ((resellAverage - retailAverage) / retailAverage) * 100;
    const roundedMargin = Math.round(margin);
    
    if (roundedMargin > 0) {
      return `+${roundedMargin}% profit potential`;
    } else if (roundedMargin < 0) {
      return `${roundedMargin}% loss risk`;
    } else {
      return 'Break-even';
    }
  }

  private assessDataQuality(retailPrices: PricingData[], resellPrices: PricingData[]): string {
    const totalSources = retailPrices.length + resellPrices.length;
    
    if (totalSources >= 8) return 'Excellent';
    if (totalSources >= 5) return 'Good';
    if (totalSources >= 3) return 'Fair';
    if (totalSources >= 1) return 'Limited';
    return 'Insufficient';
  }

  formatForAnalysis(pricing: ComprehensivePricing): {
    enhancedResellPrice: string;
    enhancedAveragePrice: string;
    marketDataSources: string[];
  } {
    const sources: string[] = [];
    
    if (pricing.retailPrices.length > 0) {
      const platforms = new Set(pricing.retailPrices.map(p => p.platform));
      sources.push(`${platforms.size} retail platforms`);
    }
    
    if (pricing.resellPrices.length > 0) {
      const resellSources = pricing.resellPrices.filter(p => p.source === 'Sold Listings');
      if (resellSources.length > 0) {
        sources.push(`eBay market data`);
      }
    }

    let enhancedResellPrice = pricing.marketSummary.recommendedResellRange;
    if (pricing.marketSummary.profitMargin !== 'Unable to calculate') {
      enhancedResellPrice += ` (${pricing.marketSummary.profitMargin})`;
    }

    let enhancedAveragePrice = 'Price not available';
    if (pricing.marketSummary.averageRetailPrice > 0) {
      enhancedAveragePrice = `$${pricing.marketSummary.averageRetailPrice} USD (retail avg)`;
    }

    return {
      enhancedResellPrice,
      enhancedAveragePrice,
      marketDataSources: sources
    };
  }
}

export function createPricingAggregator(): PricingAggregator {
  return new PricingAggregator();
}