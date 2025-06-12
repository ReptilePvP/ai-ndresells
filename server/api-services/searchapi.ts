
interface SearchAPIResponse {
  visual_matches?: Array<{
    title?: string;
    link?: string;
    thumbnail?: string;
    price?: {
      value?: string;
      currency?: string;
      raw?: string;
    };
    source?: string;
  }>;
  knowledge_graph?: {
    title?: string;
    description?: string;
    thumbnail?: string;
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
}

export class SearchAPIService {
  private apiKey: string;
  private baseUrl = 'https://www.searchapi.io/api/v1/search';

  constructor() {
    this.apiKey = 'bGfCEz5mAFmEc6mMA4L6ptYP';
  }

  async analyzeImage(imageUrl: string): Promise<ParsedAnalysisResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engine: 'google_lens',
          url: imageUrl,
          hl: 'en',
          gl: 'us'
        })
      });

      if (!response.ok) {
        throw new Error(`SearchAPI request failed: ${response.status}`);
      }

      const data: SearchAPIResponse = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('SearchAPI analysis error:', error);
      throw new Error(`SearchAPI analysis failed: ${error.message}`);
    }
  }

  private parseResponse(data: SearchAPIResponse): ParsedAnalysisResult {
    const visualMatches = data.visual_matches || [];
    const knowledgeGraph = data.knowledge_graph;

    // Extract product information
    const productName = knowledgeGraph?.title || visualMatches[0]?.title || 'Unknown Product';
    const description = knowledgeGraph?.description || 'Product identified through visual search';
    const referenceImageUrl = knowledgeGraph?.thumbnail || visualMatches[0]?.thumbnail || null;

    // Extract pricing information from visual matches
    const prices = visualMatches
      .filter(match => match.price?.value)
      .map(match => parseFloat(match.price.value.replace(/[^0-9.]/g, '')))
      .filter(price => !isNaN(price) && price > 0);

    let averageSalePrice = 'Price not available';
    let resellPrice = 'Price not available';

    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      averageSalePrice = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      resellPrice = `$${(avgPrice * 0.7).toFixed(2)} - $${(avgPrice * 0.9).toFixed(2)}`;
    }

    // Determine category and brand from product name
    const category = this.determineCategory(productName);
    const brand = this.extractBrand(productName);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(visualMatches, knowledgeGraph);

    return {
      productName,
      description,
      category,
      brand,
      model: productName,
      condition: 'Unknown',
      averageSalePrice,
      resellPrice,
      marketDemand: visualMatches.length > 5 ? 'High' : visualMatches.length > 2 ? 'Medium' : 'Low',
      profitMargin: prices.length > 0 ? '15-30%' : 'Unknown',
      referenceImageUrl,
      confidence,
      sources: ['SearchAPI', 'Google Lens'],
      thoughtProcess: `SearchAPI analysis found ${visualMatches.length} visual matches. ${knowledgeGraph ? 'Knowledge graph data available.' : 'No knowledge graph data.'} Price data extracted from ${prices.length} sources.`
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

  private calculateConfidence(visualMatches: any[], knowledgeGraph: any): number {
    let confidence = 0.3; // Base confidence
    
    if (knowledgeGraph?.title) confidence += 0.3;
    if (visualMatches.length > 0) confidence += 0.2;
    if (visualMatches.length > 5) confidence += 0.1;
    if (visualMatches.some(match => match.price)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}

export const searchAPIService = new SearchAPIService();
