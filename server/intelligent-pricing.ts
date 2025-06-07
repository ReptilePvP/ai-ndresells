interface PricingAnalysis {
  retailPrice: string;
  resellPrice: string;
  profitMargin: string;
  marketCondition: string;
  confidence: number;
}

export class IntelligentPricing {
  
  analyzeProductPricing(
    productName: string, 
    description: string, 
    geminiRetailPrice: string, 
    geminiResellPrice: string
  ): PricingAnalysis {
    
    // Extract price data from Gemini analysis
    const retailPrices = this.extractPriceRange(geminiRetailPrice);
    const resellPrices = this.extractPriceRange(geminiResellPrice);
    
    // Analyze product category and brand
    const categoryAnalysis = this.analyzeProductCategory(productName, description);
    
    // Apply market intelligence
    const enhancedPricing = this.applyMarketIntelligence(
      retailPrices, 
      resellPrices, 
      categoryAnalysis
    );
    
    return enhancedPricing;
  }
  
  private extractPriceRange(priceString: string): { low: number; high: number; avg: number } | null {
    // Match various price formats: $50, $50-$75, $50 - $75 USD, etc.
    const priceMatch = priceString.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
    
    if (!priceMatch) return null;
    
    const low = parseInt(priceMatch[1]);
    const high = priceMatch[2] ? parseInt(priceMatch[2]) : low;
    const avg = Math.round((low + high) / 2);
    
    return { low, high, avg };
  }
  
  private analyzeProductCategory(productName: string, description: string): {
    category: string;
    brand: string;
    demandLevel: 'high' | 'medium' | 'low';
    seasonality: 'seasonal' | 'year-round';
    collectibleFactor: number;
  } {
    const text = (productName + ' ' + description).toLowerCase();
    
    // Brand recognition
    const premiumBrands = ['nike', 'adidas', 'jordan', 'supreme', 'gucci', 'louis vuitton', 'rolex'];
    const streetwearBrands = ['supreme', 'off-white', 'bape', 'palace', 'stone island'];
    const sneakerBrands = ['nike', 'adidas', 'jordan', 'yeezy', 'air jordan'];
    
    let brand = 'unknown';
    let demandLevel: 'high' | 'medium' | 'low' = 'medium';
    
    if (premiumBrands.some(b => text.includes(b))) {
      brand = premiumBrands.find(b => text.includes(b)) || 'premium';
      demandLevel = 'high';
    } else if (streetwearBrands.some(b => text.includes(b))) {
      brand = streetwearBrands.find(b => text.includes(b)) || 'streetwear';
      demandLevel = 'high';
    } else if (sneakerBrands.some(b => text.includes(b))) {
      brand = sneakerBrands.find(b => text.includes(b)) || 'sneaker';
      demandLevel = 'medium';
    }
    
    // Category detection
    let category = 'general';
    if (text.includes('sneaker') || text.includes('shoe') || text.includes('jordan')) {
      category = 'footwear';
    } else if (text.includes('hoodie') || text.includes('shirt') || text.includes('jacket')) {
      category = 'apparel';
    } else if (text.includes('watch') || text.includes('jewelry')) {
      category = 'accessories';
    } else if (text.includes('nft') || text.includes('collectible') || text.includes('limited')) {
      category = 'collectibles';
      demandLevel = 'high';
    }
    
    // Collectible factor
    let collectibleFactor = 1.0;
    if (text.includes('limited edition') || text.includes('rare')) collectibleFactor = 1.5;
    if (text.includes('collaboration') || text.includes('collab')) collectibleFactor = 1.3;
    if (text.includes('vintage') || text.includes('deadstock')) collectibleFactor = 1.4;
    if (text.includes('bored ape') || text.includes('bayc') || text.includes('nft')) collectibleFactor = 1.2;
    
    return {
      category,
      brand,
      demandLevel,
      seasonality: 'year-round',
      collectibleFactor
    };
  }
  
  private applyMarketIntelligence(
    retailPrices: { low: number; high: number; avg: number } | null,
    resellPrices: { low: number; high: number; avg: number } | null,
    categoryAnalysis: any
  ): PricingAnalysis {
    
    if (!retailPrices || !resellPrices) {
      return {
        retailPrice: 'Price analysis unavailable',
        resellPrice: 'Resell analysis unavailable',
        profitMargin: 'Unable to calculate',
        marketCondition: 'Insufficient data',
        confidence: 0.3
      };
    }
    
    // Apply category-specific adjustments
    const categoryMultipliers = {
      footwear: { retail: 1.0, resell: 0.85 },
      apparel: { retail: 1.0, resell: 0.75 },
      accessories: { retail: 1.0, resell: 0.90 },
      collectibles: { retail: 1.0, resell: 1.1 },
      general: { retail: 1.0, resell: 0.80 }
    };
    
    const multiplier = categoryMultipliers[categoryAnalysis.category] || categoryMultipliers.general;
    
    // Adjust for brand premium
    let brandMultiplier = 1.0;
    if (['nike', 'jordan', 'supreme'].includes(categoryAnalysis.brand)) brandMultiplier = 1.1;
    if (['yeezy', 'off-white'].includes(categoryAnalysis.brand)) brandMultiplier = 1.2;
    
    // Calculate enhanced pricing
    const adjustedRetailAvg = Math.round(retailPrices.avg * multiplier.retail * brandMultiplier);
    const adjustedResellLow = Math.round(resellPrices.low * multiplier.resell * categoryAnalysis.collectibleFactor);
    const adjustedResellHigh = Math.round(resellPrices.high * multiplier.resell * categoryAnalysis.collectibleFactor);
    
    // Calculate profit margin
    const avgResell = Math.round((adjustedResellLow + adjustedResellHigh) / 2);
    const profitMargin = adjustedRetailAvg > 0 ? 
      Math.round(((avgResell - adjustedRetailAvg) / adjustedRetailAvg) * 100) : 0;
    
    // Determine market condition
    let marketCondition = 'Stable market';
    if (profitMargin > 20) marketCondition = 'Strong resell potential';
    else if (profitMargin > 0) marketCondition = 'Moderate profit opportunity';
    else if (profitMargin < -10) marketCondition = 'High loss risk';
    else marketCondition = 'Break-even scenario';
    
    // Calculate confidence based on data quality
    let confidence = 0.8;
    if (categoryAnalysis.brand !== 'unknown') confidence += 0.1;
    if (categoryAnalysis.demandLevel === 'high') confidence += 0.05;
    if (categoryAnalysis.collectibleFactor > 1.2) confidence += 0.05;
    
    return {
      retailPrice: `$${adjustedRetailAvg} USD (${categoryAnalysis.category} market analysis)`,
      resellPrice: `$${adjustedResellLow} - $${adjustedResellHigh} USD (${profitMargin > 0 ? '+' : ''}${profitMargin}% margin)`,
      profitMargin: profitMargin > 0 ? `+${profitMargin}% profit potential` : 
                   profitMargin < 0 ? `${profitMargin}% loss risk` : 'Break-even',
      marketCondition,
      confidence: Math.min(confidence, 1.0)
    };
  }
}

export function createIntelligentPricing(): IntelligentPricing {
  return new IntelligentPricing();
}