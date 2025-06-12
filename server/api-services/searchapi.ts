
interface SearchAPIResponse {
  visual_matches?: Array<{
    title?: string;
    link?: string;
    thumbnail?: string;
    price?: {
      value?: string;
      currency?: string;
      extracted_value?: number;
    };
    source?: string;
    position?: number;
  }>;
  knowledge_graph?: {
    title?: string;
    description?: string;
    image?: {
      url?: string;
    };
    type?: string;
  };
  shopping_results?: Array<{
    title?: string;
    price?: string;
    extracted_price?: number;
    currency?: string;
    link?: string;
    source?: string;
    thumbnail?: string;
  }>;
  search_information?: {
    total_results?: number;
    query_displayed?: string;
  };
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

export class SearchAPIService {
  private apiKey: string;
  private baseUrl = 'https://www.searchapi.io/api/v1/search';

  constructor() {
    this.apiKey = process.env.SEARCHAPI_KEY || 'bGfCEz5mAFmEc6mMA4L6ptYP';
  }

  async analyzeImageFromBase64(base64Image: string, uploadId: string): Promise<ParsedAnalysisResult> {
    // Convert base64 to publicly accessible URL
    const imageUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/api/image/${uploadId}`;
    return this.analyzeImage(imageUrl);
  }

  async analyzeImage(imageUrl: string): Promise<ParsedAnalysisResult> {
    try {
      // According to SearchAPI documentation, use GET request with query parameters
      const url = new URL(this.baseUrl);
      url.searchParams.set('engine', 'google_lens');
      url.searchParams.set('url', imageUrl);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('hl', 'en');
      url.searchParams.set('gl', 'us');
      url.searchParams.set('no_cache', 'false');

      console.log('SearchAPI Google Lens request URL:', url.toString().replace(this.apiKey, '[API_KEY]'));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Product-Analyzer/1.0)',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SearchAPI error response:', errorText);
        throw new Error(`SearchAPI request failed: ${response.status} - ${errorText}`);
      }

      const data: SearchAPIResponse = await response.json();
      console.log('SearchAPI response:', JSON.stringify(data, null, 2));
      return this.parseResponse(data);
    } catch (error) {
      console.error('SearchAPI analysis error:', error);
      throw new Error(`SearchAPI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseResponse(data: SearchAPIResponse): ParsedAnalysisResult {
    const visualMatches = data.visual_matches || [];
    const shoppingResults = data.shopping_results || [];
    const knowledgeGraph = data.knowledge_graph;

    // Extract product information
    const productName = knowledgeGraph?.title || visualMatches[0]?.title || shoppingResults[0]?.title || 'Unknown Product';
    const description = knowledgeGraph?.description || 'Product identified through visual search';
    const referenceImageUrl = knowledgeGraph?.image?.url || visualMatches[0]?.thumbnail || shoppingResults[0]?.thumbnail || null;

    // Extract pricing information from visual matches and shopping results
    const visualPrices = visualMatches
      .filter(match => match.price?.value || match.price?.extracted_value)
      .map(match => {
        if (match.price?.extracted_value) {
          return match.price.extracted_value;
        }
        if (match.price?.value) {
          return parseFloat(match.price.value.replace(/[^0-9.]/g, ''));
        }
        return 0;
      })
      .filter(price => !isNaN(price) && price > 0);

    const shoppingPrices = shoppingResults
      .filter(result => result.extracted_price || result.price)
      .map(result => {
        if (result.extracted_price) {
          return result.extracted_price;
        }
        if (result.price) {
          return parseFloat(result.price.replace(/[^0-9.]/g, ''));
        }
        return 0;
      })
      .filter(price => !isNaN(price) && price > 0);

    const allPrices = [...visualPrices, ...shoppingPrices];

    let averageSalePrice = 'Price not available';
    let resellPrice = 'Price not available';

    if (allPrices.length > 0) {
      const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      
      averageSalePrice = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      resellPrice = `$${(avgPrice * 0.7).toFixed(2)} - $${(avgPrice * 0.9).toFixed(2)}`;
    }

    // Determine category and brand from product name
    const category = this.determineCategory(productName);
    const brand = this.extractBrand(productName);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(visualMatches, shoppingResults, knowledgeGraph);

    const totalResults = visualMatches.length + shoppingResults.length;

    return {
      productName,
      description,
      category,
      brand,
      model: productName,
      condition: 'Unknown',
      averageSalePrice,
      resellPrice,
      marketDemand: totalResults > 10 ? 'High' : totalResults > 5 ? 'Medium' : 'Low',
      profitMargin: allPrices.length > 0 ? '15-30%' : 'Unknown',
      referenceImageUrl,
      confidence,
      sources: ['SearchAPI', 'Google Lens'],
      thoughtProcess: `SearchAPI Google Lens analysis found ${visualMatches.length} visual matches and ${shoppingResults.length} shopping results. ${knowledgeGraph ? 'Knowledge graph data available.' : 'No knowledge graph data.'} Price data extracted from ${allPrices.length} sources.`,
      apiProvider: 'searchapi'
    };
  }

  private determineCategory(productName: string): string {
    const name = productName.toLowerCase();
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot')) return 'Footwear';
    if (name.includes('shirt') || name.includes('dress') || name.includes('jacket')) return 'Clothing';
    if (name.includes('phone') || name.includes('laptop') || name.includes('tablet')) return 'Electronics';
    if (name.includes('watch') || name.includes('jewelry') || name.includes('ring')) return 'Accessories';
    return 'General';
  }

  private extractBrand(productName: string): string {
    const brands = ['Nike', 'Adidas', 'Jordan', 'Apple', 'Samsung', 'Sony', 'Gucci', 'Louis Vuitton', 'Rolex'];
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

  private calculateConfidence(visualMatches: any[], shoppingResults: any[], knowledgeGraph: any): number {
    let confidence = 0.3; // Base confidence
    
    if (knowledgeGraph?.title) confidence += 0.3;
    if (visualMatches.length > 0) confidence += 0.15;
    if (shoppingResults.length > 0) confidence += 0.15;
    if (visualMatches.length > 5 || shoppingResults.length > 5) confidence += 0.1;
    if (visualMatches.some(match => match.price) || shoppingResults.some(result => result.price)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}

export const searchAPIService = new SearchAPIService();
