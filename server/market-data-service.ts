import { EbayApiService, createEbayService } from './ebay-api';
import { EcommercePlatformService, createEcommerceService } from './ecommerce-platforms';
import { EbayProductionService, createEbayProductionService } from './ebay-production-auth';
import { StockXApiService, createStockXService } from './stockx-api';

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
  private stockxService: StockXApiService | null;

  constructor() {
    this.ebayService = createEbayService();
    this.ebayProdService = createEbayProductionService();
    this.ecommerceService = createEcommerceService();
    this.stockxService = createStockXService();
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

    // Try StockX marketplace data for sneakers and streetwear
    console.log('Checking StockX service availability...');
    if (this.stockxService) {
      try {
        console.log('Calling StockX marketplace search for:', productName);
        const stockxData = await this.stockxService.getProductPricing(productName);
        
        if (stockxData) {
          console.log('StockX response:', stockxData);
          if (stockxData.retailPrice > 0) {
            retailPrices.push(stockxData.retailPrice);
          }
          if (stockxData.averagePrice > 0) {
            resellPrices.push(stockxData.averagePrice);
          }
          sources.push(stockxData.dataSource);
          console.log(`StockX success: Retail $${stockxData.retailPrice}, Resell $${stockxData.averagePrice}`);
        } else {
          console.log('StockX returned no valid product data');
        }
      } catch (error) {
        console.error('StockX marketplace error:', (error as Error).message || error);
      }
    } else {
      console.log('StockX service not available');
    }

    // Try eBay production marketplace data
    console.log('Checking eBay production service availability...');
    if (this.ebayProdService) {
      try {
        console.log('Calling eBay marketplace search for:', productName);
        const ebayData = await this.ebayProdService.searchMarketplace(productName);
        
        console.log('eBay response:', ebayData);
        if (ebayData.sampleSize > 0) {
          retailPrices.push(ebayData.averagePrice);
          sources.push(`eBay ${ebayData.sampleSize} listings`);
          console.log(`eBay success: ${ebayData.sampleSize} listings, avg $${ebayData.averagePrice}`);
        } else {
          console.log('eBay returned no valid listings');
        }
      } catch (error) {
        console.error('eBay production error:', (error as Error).message || error);
      }
    } else {
      console.log('eBay production service not available');
    }

    // E-commerce platforms disabled - require API credentials setup
    console.log('Amazon/Walmart marketplace integration disabled');

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