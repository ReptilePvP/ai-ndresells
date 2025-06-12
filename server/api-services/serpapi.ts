
interface SerpAPIResponse {
  visual_matches?: Array<{
    title?: string;
    link?: string;
    thumbnail?: string;
    price?: {
      value?: number;
      currency?: string;
      raw?: string;
    };
    source?: string;
    rating?: number;
  }>;
  knowledge_graph?: {
    title?: string;
    description?: string;
    thumbnail?: string;
    type?: string;
  };
  shopping_results?: Array<{
    title?: string;
    price?: string;
    rating?: number;
    reviews?: number;
    thumbnail?: string;
    source?: string;
  }>;
}

interface ParsedAnalysisResult {
  productName: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  averageSalePrice: string;
  resellPrice: string;
  marketDemand: string;
  profitMargin: string;
  referenceImageUrl: string | null;
  confidence: number;
  sources: string[];
  thoughtProcess: string;
  apiProvider: 'gemini' | 'searchapi' | 'serpapi';
}

export class SerpAPIService {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor() {
    this.apiKey = '0df2fcc3b6090d2083f7e1840e585f994b0d0b5339a53c77c4d30a7760701e60';
  }

  async analyzeImage(imageUrl: string): Promise<ParsedAnalysisResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Product-Analyzer/1.0)',
        },
        params: new URLSearchParams({
          engine: 'google_lens',
          url: imageUrl,
          api_key: this.apiKey,
          hl: 'en',
          gl: 'us'
        } as any)
      });

      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status}`);
      }

      const data: SerpAPIResponse = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('SerpAPI analysis error:', error);
      throw new Error(`SerpAPI analysis failed: ${error.message}`);
    }
  }

  async analyzeImageWithParams(imageUrl: string): Promise<ParsedAnalysisResult> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('engine', 'google_lens');
      url.searchParams.set('url', imageUrl);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('hl', 'en');
      url.searchParams.set('gl', 'us');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Product-Analyzer/1.0)',
        }
      });

      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status}`);
      }

      const data: SerpAPIResponse = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('SerpAPI analysis error:', error);
      throw new Error(`SerpAPI analysis failed: ${error.message}`);
    }
  }

  private parseResponse(data: SerpAPIResponse): ParsedAnalysisResult {
    const visualMatches = data.visual_matches || [];
    const knowledgeGraph = data.knowledge_graph;
    const shoppingResults = data.shopping_results || [];

    // Extract product information
    const productName = knowledgeGraph?.title || visualMatches[0]?.title || shoppingResults[0]?.title || 'Unknown Product';
    const description = knowledgeGraph?.description || 'Product identified through visual search with SerpAPI';
    const referenceImageUrl = knowledgeGraph?.thumbnail || visualMatches[0]?.thumbnail || shoppingResults[0]?.thumbnail || null;

    // Extract pricing information from multiple sources
    const visualPrices = visualMatches
      .filter(match => match.price?.value)
      .map(match => match.price.value)
      .filter(price => !isNaN(price) && price > 0);

    const shoppingPrices = shoppingResults
      .filter(result => result.price)
      .map(result => parseFloat(result.price.replace(/[^0-9.]/g, '')))
      .filter(price => !isNaN(price) && price > 0);

    const allPrices = [...visualPrices, ...shoppingPrices];

    let averageSalePrice = 'Price not available';
    let resellPrice = 'Price not available';

    if (allPrices.length > 0) {
      const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      
      averageSalePrice = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      resellPrice = `$${(avgPrice * 0.6).toFixed(2)} - $${(avgPrice * 0.85).toFixed(2)}`;
    }

    // Determine category and brand from product name
    const category = this.determineCategory(productName);
    const brand = this.extractBrand(productName);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(visualMatches, knowledgeGraph, shoppingResults);

    // Determine market demand based on result quantity and ratings
    const marketDemand = this.assessMarketDemand(visualMatches, shoppingResults);

    return {
      productName,
      description,
      category,
      brand,
      model: productName,
      condition: 'Unknown',
      averageSalePrice,
      resellPrice,
      marketDemand,
      profitMargin: allPrices.length > 0 ? '20-40%' : 'Unknown',
      referenceImageUrl,
      confidence,
      sources: ['SerpAPI', 'Google Lens'],
      thoughtProcess: `SerpAPI analysis found ${visualMatches.length} visual matches and ${shoppingResults.length} shopping results. ${knowledgeGraph ? 'Knowledge graph data available.' : 'No knowledge graph data.'} Price data extracted from ${allPrices.length} sources across visual and shopping results.`
    };
  }

  private determineCategory(productName: string): string {
    const name = productName.toLowerCase();
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || name.includes('sandal')) return 'Footwear';
    if (name.includes('shirt') || name.includes('dress') || name.includes('jacket') || name.includes('pants') || name.includes('jeans')) return 'Clothing';
    if (name.includes('phone') || name.includes('laptop') || name.includes('tablet') || name.includes('computer') || name.includes('iphone') || name.includes('ipad')) return 'Electronics';
    if (name.includes('watch') || name.includes('jewelry') || name.includes('ring') || name.includes('necklace') || name.includes('bracelet')) return 'Accessories';
    if (name.includes('bag') || name.includes('purse') || name.includes('backpack') || name.includes('wallet')) return 'Bags';
    if (name.includes('book') || name.includes('novel') || name.includes('textbook')) return 'Books';
    if (name.includes('game') || name.includes('console') || name.includes('toy')) return 'Games & Toys';
    return 'General';
  }

  private extractBrand(productName: string): string {
    const brands = [
      'Nike', 'Adidas', 'Jordan', 'Apple', 'Samsung', 'Sony', 'Gucci', 'Louis Vuitton', 
      'Rolex', 'Omega', 'Chanel', 'Prada', 'Versace', 'Balenciaga', 'Off-White',
      'Supreme', 'Yeezy', 'Google', 'Microsoft', 'Dell', 'HP', 'Canon', 'Nikon'
    ];
    
    const name = productName.toLowerCase();
    
    for (const brand of brands) {
      if (name.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    // Try to extract first word as potential brand
    const words = productName.split(' ');
    return words[0] || 'Unknown';
  }

  private calculateConfidence(visualMatches: any[], knowledgeGraph: any, shoppingResults: any[]): number {
    let confidence = 0.2; // Base confidence
    
    if (knowledgeGraph?.title) confidence += 0.3;
    if (knowledgeGraph?.description) confidence += 0.1;
    if (visualMatches.length > 0) confidence += 0.2;
    if (visualMatches.length > 3) confidence += 0.1;
    if (shoppingResults.length > 0) confidence += 0.1;
    if (visualMatches.some(match => match.price) || shoppingResults.some(result => result.price)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private assessMarketDemand(visualMatches: any[], shoppingResults: any[]): string {
    const totalResults = visualMatches.length + shoppingResults.length;
    const hasHighRatings = shoppingResults.some(result => result.rating && result.rating > 4.0);
    const hasReviews = shoppingResults.some(result => result.reviews && result.reviews > 100);

    if (totalResults > 15 || (hasHighRatings && hasReviews)) return 'High';
    if (totalResults > 8 || hasHighRatings) return 'Medium';
    return 'Low';
  }
}

export const serpAPIService = new SerpAPIService();
