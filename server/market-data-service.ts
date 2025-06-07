import { EbayApiService, createEbayService } from './ebay-api';
import { EcommercePlatformService, createEcommerceService } from './ecommerce-platforms';
import { EbayProductionService, createEbayProductionService } from './ebay-production-auth';

interface MarketDataResult {
  retailPrice: string;
  resellPrice: string;
  marketSummary: string;
  dataQuality: 'authenticated' | 'estimated' | 'limited';
  sources: string[];
}

export class MarketDataService {
  private ebayService: EbayApiService | null;
  private ebayProdService: EbayProductionService | null;
  private ecommerceService: EcommercePlatformService;

  constructor() {
    this.ebayService = createEbayService();
    this.ebayProdService = createEbayProductionService();
    this.ecommerceService = createEcommerceService();
  }

  async getMarketData(productName: string, geminiRetailPrice: string, geminiResellPrice: string): Promise<MarketDataResult> {
    console.log(`Fetching market data for: ${productName}`);
    
    // Try to get authentic market data
    const authenticData = await this.tryAuthenticSources(productName);
    
    if (authenticData.sources.length > 0) {
      return authenticData;
    }

    // Fall back to enhanced estimates based on Gemini data
    return this.createEnhancedEstimate(productName, geminiRetailPrice, geminiResellPrice);
  }

  private async tryAuthenticSources(productName: string): Promise<MarketDataResult> {
    const sources: string[] = [];
    let retailPrices: number[] = [];
    let resellPrices: number[] = [];

    // Try eBay production marketplace data
    if (this.ebayProdService) {
      try {
        const ebayData = await this.ebayProdService.searchMarketplace(productName);
        
        if (ebayData.sampleSize > 0) {
          retailPrices.push(ebayData.averagePrice);
          sources.push(`eBay ${ebayData.sampleSize} listings`);
        }
      } catch (error) {
        console.log('eBay production data unavailable:', (error as Error).message || error);
      }
    }

    // Try e-commerce platforms
    try {
      const ecommerceData = await this.ecommerceService.getComprehensivePricing(productName);
      
      if (ecommerceData.platforms.length > 0) {
        const platformPrices = ecommerceData.platforms.map(p => p.currentPrice).filter(p => p > 0);
        retailPrices.push(...platformPrices);
        
        const platformNames = new Set(ecommerceData.platforms.map(p => p.platform));
        sources.push(`${platformNames.size} retail platforms`);
      }
    } catch (error) {
      console.log('E-commerce data unavailable:', error.message);
    }

    if (sources.length === 0) {
      return { retailPrice: '', resellPrice: '', marketSummary: '', dataQuality: 'limited', sources: [] };
    }

    // Calculate averages from authentic data
    const avgRetail = retailPrices.length > 0 ? 
      Math.round(retailPrices.reduce((sum, p) => sum + p, 0) / retailPrices.length) : 0;
    
    const avgResell = resellPrices.length > 0 ? 
      Math.round(resellPrices.reduce((sum, p) => sum + p, 0) / resellPrices.length) : 0;

    const retailPrice = avgRetail > 0 ? `$${avgRetail} USD (market average)` : '';
    
    let resellPrice = '';
    if (avgResell > 0) {
      resellPrice = `$${Math.round(avgResell * 0.85)} - $${Math.round(avgResell * 1.15)} USD (market-based)`;
    } else if (avgRetail > 0) {
      resellPrice = `$${Math.round(avgRetail * 0.60)} - $${Math.round(avgRetail * 0.85)} USD (estimated from retail)`;
    }

    const marketSummary = this.createMarketSummary(avgRetail, avgResell, sources.length);

    return {
      retailPrice,
      resellPrice,
      marketSummary,
      dataQuality: 'authenticated',
      sources
    };
  }

  private createEnhancedEstimate(productName: string, geminiRetailPrice: string, geminiResellPrice: string): MarketDataResult {
    // Extract price ranges from Gemini analysis
    const retailMatch = geminiRetailPrice.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
    const resellMatch = geminiResellPrice.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);

    let enhancedRetailPrice = geminiRetailPrice;
    let enhancedResellPrice = geminiResellPrice;
    let marketSummary = 'Based on AI analysis';

    if (retailMatch) {
      const retailLow = parseInt(retailMatch[1]);
      const retailHigh = retailMatch[2] ? parseInt(retailMatch[2]) : retailLow;
      const avgRetail = Math.round((retailLow + retailHigh) / 2);
      
      enhancedRetailPrice = `$${avgRetail} USD (AI analysis)`;
      
      // Improve resell estimate based on retail data
      if (resellMatch) {
        const resellLow = parseInt(resellMatch[1]);
        const resellHigh = resellMatch[2] ? parseInt(resellMatch[2]) : resellLow;
        
        // Calculate profit margin
        const avgResell = Math.round((resellLow + resellHigh) / 2);
        const profitMargin = avgRetail > 0 ? Math.round(((avgResell - avgRetail) / avgRetail) * 100) : 0;
        
        if (profitMargin > 0) {
          enhancedResellPrice = `${geminiResellPrice} (+${profitMargin}% profit potential)`;
        } else if (profitMargin < 0) {
          enhancedResellPrice = `${geminiResellPrice} (${profitMargin}% loss risk)`;
        }
        
        marketSummary = `AI analysis suggests ${profitMargin > 0 ? 'profitable' : 'challenging'} resell opportunity`;
      }
    }

    return {
      retailPrice: enhancedRetailPrice,
      resellPrice: enhancedResellPrice,
      marketSummary,
      dataQuality: 'estimated',
      sources: ['AI analysis']
    };
  }

  private createMarketSummary(avgRetail: number, avgResell: number, sourceCount: number): string {
    if (avgRetail > 0 && avgResell > 0) {
      const profitMargin = Math.round(((avgResell - avgRetail) / avgRetail) * 100);
      return `Market data from ${sourceCount} sources shows ${profitMargin > 0 ? profitMargin + '% profit potential' : 'challenging resell market'}`;
    } else if (avgRetail > 0) {
      return `Retail pricing available from ${sourceCount} sources`;
    } else if (avgResell > 0) {
      return `Resell market data from ${sourceCount} sources`;
    }
    return `Limited market data from ${sourceCount} sources`;
  }
}

export function createMarketDataService(): MarketDataService {
  return new MarketDataService();
}