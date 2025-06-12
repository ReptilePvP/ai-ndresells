
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
    this.apiKey = process.env.SERPAPI_KEY || '0df2fcc3b6090d2083f7e1840e585f994b0d0b5339a53c77c4d30a7760701e60';
  }

  async analyzeImage(imageUrl: string): Promise<ParsedAnalysisResult> {
    try {
      // According to SerpAPI documentation, build URL with query parameters
      const url = new URL(this.baseUrl);
      url.searchParams.set('engine', 'google_lens');
      url.searchParams.set('url', imageUrl);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('hl', 'en');
      url.searchParams.set('gl', 'us');

      console.log('SerpAPI Google Lens request URL:', url.toString().replace(this.apiKey, '[API_KEY]'));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Product-Analyzer/1.0)',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SerpAPI error response:', errorText);
        throw new Error(`SerpAPI request failed: ${response.status} - ${errorText}`);
      }

      const data: SerpAPIResponse = await response.json();
      console.log('SerpAPI response keys:', Object.keys(data));
      console.log('SerpAPI visual_matches count:', data.visual_matches?.length || 0);
      console.log('SerpAPI shopping_results count:', data.shopping_results?.length || 0);
      console.log('SerpAPI knowledge_graph exists:', !!data.knowledge_graph);
      
      // Log sample titles for debugging
      if (data.visual_matches && data.visual_matches.length > 0) {
        console.log('First visual match title:', data.visual_matches[0].title);
      }
      if (data.shopping_results && data.shopping_results.length > 0) {
        console.log('First shopping result title:', data.shopping_results[0].title);
      }
      if (data.knowledge_graph?.title) {
        console.log('Knowledge graph title:', data.knowledge_graph.title);
      }
      
      return this.parseResponse(data);
    } catch (error) {
      console.error('SerpAPI analysis error:', error);
      throw new Error(`SerpAPI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`SerpAPI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseResponse(data: SerpAPIResponse): ParsedAnalysisResult {
    console.log('SerpAPI parsing response with keys:', Object.keys(data));
    
    const visualMatches = data.visual_matches || [];
    const knowledgeGraph = data.knowledge_graph;
    const shoppingResults = data.shopping_results || [];

    // Enhanced product name extraction with comprehensive fallbacks
    let productName = 'Unknown Product';
    let foundSource = 'none';
    
    // Try knowledge graph first
    if (knowledgeGraph?.title && knowledgeGraph.title.trim() !== '') {
      productName = knowledgeGraph.title.trim();
      foundSource = 'knowledge_graph';
    }
    // Try visual matches - look for product-related titles
    else if (visualMatches.length > 0) {
      // Look for shopping/e-commerce related matches first
      const shoppingMatch = visualMatches.find(match => 
        match.title && 
        match.source && 
        (match.source.toLowerCase().includes('amazon') || 
         match.source.toLowerCase().includes('ebay') ||
         match.source.toLowerCase().includes('walmart') ||
         match.source.toLowerCase().includes('target') ||
         match.source.toLowerCase().includes('stockx') ||
         match.source.toLowerCase().includes('nike') ||
         match.source.toLowerCase().includes('adidas') ||
         match.title.toLowerCase().includes('shoe') ||
         match.title.toLowerCase().includes('sneaker') ||
         match.title.toLowerCase().includes('boot') ||
         match.title.toLowerCase().includes('product'))
      );
      
      if (shoppingMatch && shoppingMatch.title) {
        productName = shoppingMatch.title.trim();
        foundSource = `visual_matches_shopping (${shoppingMatch.source})`;
      } else {
        // Fall back to first valid title
        for (const match of visualMatches) {
          if (match.title && match.title.trim() !== '' && !match.title.toLowerCase().includes('logo')) {
            productName = match.title.trim();
            foundSource = `visual_matches (${match.source})`;
            break;
          }
        }
      }
    }
    // Try shopping results
    else if (shoppingResults.length > 0) {
      for (const result of shoppingResults) {
        if (result.title && result.title.trim() !== '') {
          productName = result.title.trim();
          foundSource = 'shopping_results';
          break;
        }
      }
    }
    
    // Try additional fields that might contain product info
    if (productName === 'Unknown Product') {
      const potentialFields = ['query', 'search_query', 'original_query', 'input'];
      
      for (const field of potentialFields) {
        if ((data as any)[field] && typeof (data as any)[field] === 'string') {
          productName = (data as any)[field];
          foundSource = field;
          break;
        }
      }
    }
    
    console.log(`SerpAPI product name extracted: "${productName}" from ${foundSource}`);

    const description = knowledgeGraph?.description || 
                       (visualMatches.length > 0 ? `Product identified through visual search with ${visualMatches.length} visual matches` : 'Product identified through visual search with SerpAPI');
    
    // Enhanced reference image selection - prioritize shopping/product images
    let referenceImageUrl: string | null = null;
    if (knowledgeGraph?.thumbnail) {
      referenceImageUrl = knowledgeGraph.thumbnail;
    } else if (visualMatches.length > 0) {
      // Look for product images from shopping sites first
      const productMatch = visualMatches.find(match => 
        match.thumbnail && 
        match.source && 
        (match.source.toLowerCase().includes('amazon') ||
         match.source.toLowerCase().includes('ebay') ||
         match.source.toLowerCase().includes('stockx') ||
         match.source.toLowerCase().includes('nike') ||
         match.source.toLowerCase().includes('adidas'))
      );
      
      if (productMatch?.thumbnail) {
        referenceImageUrl = productMatch.thumbnail;
      } else if (visualMatches[0]?.thumbnail) {
        referenceImageUrl = visualMatches[0].thumbnail;
      }
    } else if (shoppingResults.length > 0 && shoppingResults[0]?.thumbnail) {
      referenceImageUrl = shoppingResults[0].thumbnail;
    }

    // Extract pricing information from multiple sources
    const visualPrices = visualMatches
      .filter(match => match.price?.value !== undefined)
      .map(match => match.price!.value!)
      .filter(price => !isNaN(price) && price > 0);

    const shoppingPrices = shoppingResults
      .filter(result => result.price)
      .map(result => parseFloat(result.price!.replace(/[^0-9.]/g, '')))
      .filter(price => !isNaN(price) && price > 0);

    const allPrices = [...visualPrices, ...shoppingPrices];

    let averageSalePrice = 'Price not available';
    let resellPrice = 'Price not available';

    if (allPrices.length > 0) {
      const avgPrice = allPrices.reduce((a, b) => (a || 0) + (b || 0), 0) / allPrices.length;
      const validPrices = allPrices.filter(p => p !== undefined) as number[];
      if (validPrices.length > 0) {
        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);
        
        averageSalePrice = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
        resellPrice = `$${(avgPrice * 0.6).toFixed(2)} - $${(avgPrice * 0.85).toFixed(2)}`;
      }
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
      thoughtProcess: `SerpAPI analysis found ${visualMatches.length} visual matches and ${shoppingResults.length} shopping results. ${knowledgeGraph ? 'Knowledge graph data available.' : 'No knowledge graph data.'} Price data extracted from ${allPrices.length} sources across visual and shopping results.`,
      apiProvider: 'serpapi'
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
