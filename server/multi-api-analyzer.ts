import { GoogleGenAI } from "@google/genai";
import { searchAPIService } from "./api-services/searchapi";
import { serpAPIService } from "./api-services/serpapi";
import { createEbayProductionService } from "./ebay-production-auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               process.env.GOOGLE_GEMINI_API_KEY || 
               "";
const genAI = new GoogleGenAI({ apiKey });

interface UnifiedAnalysisResult {
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

export class MultiAPIAnalyzer {
  async analyzeImage(
    base64Image: string, 
    apiProvider: 'gemini' | 'searchapi' | 'serpapi',
    uploadPath?: string
  ): Promise<UnifiedAnalysisResult> {
    try {
      let result: UnifiedAnalysisResult;

      switch (apiProvider) {
        case 'gemini':
          result = await this.analyzeWithGemini(base64Image);
          break;
        case 'searchapi':
          result = await this.analyzeWithSearchAPI(base64Image, uploadPath);
          break;
        case 'serpapi':
          result = await this.analyzeWithSerpAPI(base64Image, uploadPath);
          break;
        default:
          throw new Error(`Unsupported API provider: ${apiProvider}`);
      }

      result.apiProvider = apiProvider;
      return result;
    } catch (error) {
      console.error(`${apiProvider} analysis failed:`, error);

      if (apiProvider === 'gemini') {
        // If Gemini fails, there's no fallback
        throw error;
      }

      // Fallback to Gemini
      console.log(`Falling back to Gemini due to ${apiProvider} failure.`);
      const result = await this.analyzeWithGemini(base64Image);
      result.thoughtProcess = `Analysis with ${apiProvider} failed. ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to Gemini. ${result.thoughtProcess}`;
      return result;
    }
  }

  private async findReferenceImage(productName: string): Promise<string | null> {
    try {
      // Use eBay to find reference images from actual marketplace listings
      const ebayService = createEbayProductionService();
      if (!ebayService) {
        console.log('eBay service not available for reference images');
        return null;
      }

      const marketData = await ebayService.searchMarketplace(productName);
      
      if (marketData.recentSales && marketData.recentSales.length > 0) {
        // Find first listing with an image
        for (const sale of marketData.recentSales) {
          if (sale.image?.imageUrl) {
            // Download and store the reference image locally
            const referenceUrl = await this.downloadReferenceImage(sale.image.imageUrl, productName);
            return referenceUrl;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Reference image search failed:', error);
      return null;
    }
  }

  private async downloadReferenceImage(imageUrl: string, productName: string): Promise<string | null> {
    try {
      console.log('Downloading reference image from eBay:', imageUrl);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.log('Failed to download reference image:', response.status);
        return null;
      }

      const imageBuffer = await response.arrayBuffer();
      const imageHash = crypto.createHash('md5').update(Buffer.from(imageBuffer)).digest('hex');
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `ref_${imageHash}.${extension}`;
      const uploadDir = path.join(process.cwd(), "uploads");
      const referenceImagePath = path.join(uploadDir, filename);

      // Ensure the upload directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Write the file
      await fs.writeFile(referenceImagePath, Buffer.from(imageBuffer));
      console.log('Reference image downloaded and stored:', filename);
      
      return filename;
    } catch (error) {
      console.error('Error downloading reference image:', error);
      return null;
    }
  }

  async analyzeImageWithFallback(
    base64Image: string, 
    originalProvider: 'searchapi' | 'serpapi',
    uploadPath?: string
  ): Promise<UnifiedAnalysisResult> {
    console.log(`Performing fallback analysis from ${originalProvider} to Gemini`);
    
    const result = await this.analyzeWithGemini(base64Image);
    result.apiProvider = 'gemini';
    
    // Add note about fallback in thought process
    result.thoughtProcess = `Originally attempted with ${originalProvider} but switched to Gemini AI. ${result.thoughtProcess}`;
    
    return result;
  }

  private async analyzeWithGemini(base64Image: string): Promise<UnifiedAnalysisResult> {
    const GEMINI_PROMPT = `
Analyze this product image and provide detailed information for resale market intelligence.

Return ONLY a JSON object with this exact structure:
{
  "productName": "Complete product name with brand and model",
  "description": "Detailed description including features and condition",
  "category": "Product category",
  "brand": "Brand name",
  "model": "Model identifier",
  "condition": "Apparent condition from image",
  "averageSalePrice": "Current retail price range",
  "resellPrice": "Estimated resale price range",
  "marketDemand": "High/Medium/Low",
  "profitMargin": "Estimated profit percentage",
  "referenceImageUrl": null,
  "confidence": 0.8,
  "sources": ["Gemini AI"],
  "thoughtProcess": "Step-by-step analysis explanation"
}
`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: [{
        role: "user",
        parts: [
          { text: GEMINI_PROMPT },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      }],
    } as any);

    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new Error("Invalid response from Gemini");
    }

    const text = result.candidates[0].content.parts?.[0]?.text;
    if (!text) {
      throw new Error("No text content in Gemini response");
    }

    // Parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Gemini response");
      }

      // Sanitize the JSON string to remove control characters
      const sanitizedJson = jsonMatch[0].replace(/[\x00-\x1F\x7F-\x9F]/g, "");

      const analysisData = JSON.parse(sanitizedJson);

      // Try to find a reference image for the identified product
      let referenceImageUrl = null;
      const productName = analysisData.productName || "Unknown Product";
      
      if (productName !== "Unknown Product") {
        try {
          referenceImageUrl = await this.findReferenceImage(productName);
        } catch (error) {
          console.log("Could not find reference image:", error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return {
        productName: analysisData.productName || "Unknown Product",
        description: analysisData.description || "AI-generated product analysis",
        category: analysisData.category || "General",
        brand: analysisData.brand || "Unknown",
        model: analysisData.model || "Unknown",
        condition: analysisData.condition || "Unknown",
        averageSalePrice: analysisData.averageSalePrice || "Price not available",
        resellPrice: analysisData.resellPrice || "Price not available",
        marketDemand: analysisData.marketDemand || "Medium",
        profitMargin: analysisData.profitMargin || "Unknown",
        referenceImageUrl,
        confidence: analysisData.confidence || 0.7,
        sources: ["Gemini AI"],
        thoughtProcess: analysisData.thoughtProcess || "Gemini AI analysis completed",
        apiProvider: 'gemini'
      };
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  }

  private async analyzeWithSearchAPI(base64Image: string, uploadPath?: string): Promise<UnifiedAnalysisResult> {
    if (!uploadPath) {
      throw new Error("SearchAPI requires an uploaded image. Upload the image first to use Google Lens analysis.");
    }

    // Construct proper public URL for the image
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : process.env.PUBLIC_URL || 'http://localhost:5000';
    
    const imageUrl = `${baseUrl}/uploads/${uploadPath}`;
    console.log('SearchAPI using image URL:', imageUrl);

    const result = await searchAPIService.analyzeImageFromUrl(imageUrl, uploadPath);
    return {
      ...result,
      apiProvider: 'searchapi'
    };
  }

  private async analyzeWithSerpAPI(base64Image: string, uploadPath?: string): Promise<UnifiedAnalysisResult> {
    // For SerpAPI, we also need to provide an image URL
    let imageUrl: string;

    if (uploadPath) {
      // Use the public uploads route for external API access
      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : process.env.PUBLIC_URL || 'http://localhost:5000';
      imageUrl = `${baseUrl}/uploads/${uploadPath}`;
    } else {
      // For live analysis or when upload path is not available, we need to handle this differently
      throw new Error("SerpAPI requires an accessible image URL. Upload the image first.");
    }

    const result = await serpAPIService.analyzeImageWithParams(imageUrl);
    return {
      ...result,
      apiProvider: 'serpapi'
    };
  }
}

export const multiAPIAnalyzer = new MultiAPIAnalyzer();
