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
    this.apiKey = process.env.SEARCHAPI_KEY || '';

    if (!this.apiKey) {
      console.warn('SearchAPI key not found in environment variables. Please set SEARCHAPI_KEY.');
    }
  }

  async analyzeImageFromUrl(imageUrl: string, uploadId: string): Promise<ParsedAnalysisResult> {
    // First, test if the image URL is accessible
    try {
      console.log('Testing image URL accessibility:', imageUrl);
      const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
      if (!imageResponse.ok) {
        throw new Error(`Image URL not accessible: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      console.log('Image URL is accessible, proceeding with SearchAPI analysis');
    } catch (error) {
      console.error('Image URL accessibility test failed:', error);
      throw new Error(`Image URL is not publicly accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    let data = await this.performSearch(imageUrl, 'visual_matches');

    if (!data.visual_matches?.length && !data.shopping_results?.length && !data.knowledge_graph) {
      console.log("Visual matches failed, trying 'all' search type");
      data = await this.performSearch(imageUrl, 'all');
    }

    if (!data.visual_matches?.length && !data.shopping_results?.length && !data.knowledge_graph) {
      throw new Error('SearchAPI did not return any results for any search type. The image may not contain recognizable products or brands.');
    }

    return this.parseResponse(data);
  }

  private async performSearch(imageUrl: string, searchType: 'visual_matches' | 'all'): Promise<SearchAPIResponse> {
    try {
      const params = new URLSearchParams({
        'engine': 'google_lens',
        'search_type': searchType,
        'url': imageUrl,
        'api_key': this.apiKey,
        'hl': 'en',
        'gl': 'us',
        'no_cache': 'false'
      });

      const requestUrl = `${this.baseUrl}?${params}`;
      console.log(`SearchAPI Google Lens request URL (type: ${searchType}):`, requestUrl.replace(this.apiKey, '[API_KEY]'));

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SearchAPI error response:', response.status, errorText);

        if (response.status === 401) {
          throw new Error('SearchAPI authentication failed. Please check your API key.');
        } else if (response.status === 403) {
          throw new Error('SearchAPI access forbidden. Please verify your subscription and permissions.');
        } else if (response.status === 429) {
          throw new Error('SearchAPI rate limit exceeded. Please try again later.');
        }

        throw new Error(`SearchAPI request failed: ${response.status} - ${errorText}`);
      }

      const data: SearchAPIResponse = await response.json();

      if ((data as any).error) {
        const errorMessage = (data as any).error.message || (data as any).error;
        console.error('SearchAPI returned error:', errorMessage);
        throw new Error(`SearchAPI error: ${errorMessage}`);
      }

      return data;
    } catch (error) {
      console.error(`SearchAPI analysis error (type: ${searchType}):`, error);
      if (error instanceof Error) {
        throw new Error(`SearchAPI analysis failed: ${error.message}`);
      }
      throw new Error('SearchAPI analysis failed with unknown error');
    }
  }

  async analyzeImageFromBase64(base64Image: string, uploadId: string): Promise<ParsedAnalysisResult> {
    // Convert base64 to publicly accessible URL
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : process.env.PUBLIC_URL || 'http://localhost:5000';
    const imageUrl = `${baseUrl}/uploads/${uploadId}`;
    return this.analyzeImage(imageUrl);
  }

  async analyzeImage(imageUrl: string): Promise<ParsedAnalysisResult> {
    try {
      // Use SearchAPI format matching the working example
      const params = new URLSearchParams({
        'engine': 'google_lens',
        'search_type': 'visual_matches',
        'url': imageUrl,
        'api_key': this.apiKey,
        'hl': 'en',
        'gl': 'us',
        'no_cache': 'false'
      });

      const requestUrl = `${this.baseUrl}?${params}`;
      console.log('SearchAPI Google Lens request URL:', requestUrl.replace(this.apiKey, '[API_KEY]'));

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SearchAPI error response:', response.status, errorText);

        // Handle specific SearchAPI error codes
        if (response.status === 401) {
          throw new Error('SearchAPI authentication failed. Please check your API key.');
        } else if (response.status === 403) {
          throw new Error('SearchAPI access forbidden. Please verify your subscription and permissions.');
        } else if (response.status === 429) {
          throw new Error('SearchAPI rate limit exceeded. Please try again later.');
        }

        throw new Error(`SearchAPI request failed: ${response.status} - ${errorText}`);
      }

      const data: SearchAPIResponse = await response.json();

      // Check for SearchAPI-specific error in response
      if ((data as any).error) {
        const errorMessage = (data as any).error.message || (data as any).error;
        console.error('SearchAPI returned error:', errorMessage);
        throw new Error(`SearchAPI error: ${errorMessage}`);
      }

      if (!data.visual_matches?.length && !data.shopping_results?.length && !data.knowledge_graph) {
        throw new Error('SearchAPI did not return any visual, shopping, or knowledge graph results.');
      }

      console.log('SearchAPI response keys:', Object.keys(data));
      console.log('SearchAPI visual_matches count:', data.visual_matches?.length || 0);
      console.log('SearchAPI shopping_results count:', data.shopping_results?.length || 0);
      console.log('SearchAPI knowledge_graph exists:', !!data.knowledge_graph);

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
      console.error('SearchAPI analysis error:', error);
      throw new Error(`SearchAPI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseResponse(data: SearchAPIResponse): ParsedAnalysisResult {
    console.log('SearchAPI parsing response with keys:', Object.keys(data));

    const visualMatches = data.visual_matches || [];
    const shoppingResults = data.shopping_results || [];
    const knowledgeGraph = data.knowledge_graph;

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
      // Check if there are any other fields in the response that might contain product info
      const responseStr = JSON.stringify(data);
      const potentialFields = ['query', 'search_query', 'original_query', 'input'];

      for (const field of potentialFields) {
        if ((data as any)[field] && typeof (data as any)[field] === 'string') {
          productName = (data as any)[field];
          foundSource = field;
          break;
        }
      }
    }

    // If still unknown, try to extract from search information
    if (productName === 'Unknown Product' && data.search_information?.query_displayed) {
      productName = data.search_information.query_displayed;
      foundSource = 'search_information';
    }

    console.log(`SearchAPI product name extracted: "${productName}" from ${foundSource}`);

    const description = knowledgeGraph?.description || 
                       (visualMatches.length > 0 ? `Product identified through visual search with ${visualMatches.length} visual matches` : 'Product identified through visual search');

    // Enhanced reference image selection - prioritize shopping/product images
    let referenceImageUrl: string | null = null;
    if (knowledgeGraph?.image?.url) {
      referenceImageUrl = knowledgeGraph.image.url;
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

  // Test method to verify API setup
  async testApiConnection(): Promise<boolean> {
    try {
      const testUrl = 'https://upload.wikimedia.org/wikipedia/en/7/7a/Harry_Potter_and_the_Philosopher%27s_Stone_banner.jpg';
      const params = new URLSearchParams({
        'engine': 'google_lens',
        'search_type': 'visual_matches',
        'url': testUrl,
        'api_key': this.apiKey,
        'hl': 'en',
        'gl': 'us'
      });

      const requestUrl = `${this.baseUrl}?${params}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('SearchAPI test successful:', !!data);
        return true;
      } else {
        console.error('SearchAPI test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('SearchAPI test error:', error);
      return false;
    }
  }
}

export const searchAPIService = new SearchAPIService();
