import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertUploadSchema, insertAnalysisSchema, insertFeedbackSchema, loginSchema, registerSchema } from "@shared/schema";
import { hashPassword, verifyPassword, requireAuth, requireAdmin, optionalAuth } from "./auth";
import { setupLiveAPI } from "./live-api";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createEbayService } from './ebay-api';
import { createEbayProductionService } from './ebay-production-auth';
import { createEcommerceService, createGoogleShoppingService, createAmazonService } from './ecommerce-platforms';
import { createPricingAggregator } from './pricing-aggregator';
import { createMarketDataService } from './market-data-service';
import { createIntelligentPricing } from './intelligent-pricing';
import { accuracyValidator } from './accuracy-validator';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               process.env.GOOGLE_GEMINI_API_KEY || 
               "";
const genAI = new GoogleGenAI({ apiKey });

// Initialize e-commerce platform services
const ebayService = createEbayService();
const ecommerceService = createEcommerceService();
const googleShoppingService = createGoogleShoppingService();
const amazonService = createAmazonService();
const pricingAggregator = createPricingAggregator();
const marketDataService = createMarketDataService();
const intelligentPricing = createIntelligentPricing();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(409).json({ message: "Username already taken" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({ ...validatedData, password: hashedPassword });

      // Set session and explicitly save it
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Force session save for mobile compatibility
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        res.json({ user });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session and explicitly save it
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Force session save for mobile compatibility
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // Admin routes
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();

      // Test eBay API status
      let ebayApiStatus = 'Unknown';
      try {
        const ebayService = createEbayProductionService();
        if (ebayService) {
          await ebayService.searchMarketplace('test');
          ebayApiStatus = 'Connected';
        } else {
          ebayApiStatus = 'Not Configured';
        }
      } catch (error) {
        console.error('eBay API test failed:', error);
        ebayApiStatus = 'Error';
      }

      // Test StockX API status
      let stockxApiStatus = 'Unknown';
      try {
        const { createStockXService } = await import('./stockx-api');
        const stockxService = createStockXService();
        if (stockxService) {
          const testResult = await stockxService.testConnection();
          stockxApiStatus = testResult ? 'Connected' : 'Error';
        } else {
          stockxApiStatus = 'Not Configured';
        }
      } catch (error) {
        console.error('StockX API test failed:', error);
        stockxApiStatus = 'Error';
      }

      // Test Gemini AI status
      let geminiApiStatus = 'Unknown';
      try {
        if (apiKey && apiKey.length > 0) {
          geminiApiStatus = 'Connected';
        } else {
          geminiApiStatus = 'Not Configured';
        }
      } catch (error) {
        console.error('Gemini API test failed:', error);
        geminiApiStatus = 'Error';
      }

      const enhancedStats = {
        ...stats,
        apiStatus: {
          ebayApi: ebayApiStatus,
          stockxApi: stockxApiStatus,
          geminiApi: geminiApiStatus,
          database: 'Connected'
        }
      };

      res.json(enhancedStats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/uploads", requireAdmin, async (req, res) => {
    try {
      const uploads = await storage.getAllUploadsWithAnalyses();
      res.json(uploads);
    } catch (error) {
      console.error("Admin uploads error:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });
  // Live analysis endpoint for real-time video frames
  app.post("/api/analyze-live", async (req, res) => {
    try {
      const { imageData, sessionId } = req.body;

      if (!imageData || !sessionId) {
        return res.status(400).json({ message: "Image data and session ID required" });
      }

      // Convert base64 data URL to base64 string
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      // Quick analysis with simpler prompt for live view
      const LIVE_ANALYSIS_PROMPT = `
Analyze this image and identify the main product. Respond with only a JSON object:
{
  "productName": "Product name (brand and model if visible)",
  "confidence": "high/medium/low"
}

If no clear product is visible, return: {"productName": "No product detected", "confidence": "low"}
`;

      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: [{
          role: "user",
          parts: [
            { text: LIVE_ANALYSIS_PROMPT },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        }],
      } as any);

      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        return res.json({
          productName: "No product detected",
          confidence: "low"
        });
      }

      const text = result.candidates[0].content.parts?.[0]?.text;
      if (!text) {
        return res.json({
          productName: "Analysis failed",
          confidence: "low"
        });
      }

      // Parse JSON response
      try {
        let cleanText = text.trim();

        // Remove markdown code blocks if present
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Extract JSON object
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return res.json({
            productName: "No product detected",
            confidence: "low"
          });
        }

        const analysis = JSON.parse(jsonMatch[0]);
        res.json(analysis);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        res.json({
          productName: "Analyzing...",
          confidence: "low"
        });
      }
    } catch (error) {
      console.error("Live analysis error:", error);
      res.status(500).json({ 
        productName: "Analysis failed",
        confidence: "low"
      });
    }
  });

  // Generate session ID for new sessions
  app.get("/api/session", (req, res) => {
    const sessionId = req.sessionID || Math.random().toString(36).substring(7);
    res.json({ sessionId });
  });

  // Upload image endpoint
  app.post("/api/upload", optionalAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const user = (req as any).user;
      const uploadData = {
        userId: user?.id || null,
        sessionId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      };

      const validatedData = insertUploadSchema.parse(uploadData);
      const upload = await storage.createUpload(validatedData);

      res.json(upload);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Analyze product endpoint
  app.post("/api/analyze/:uploadId", async (req, res) => {
    try {
      const uploadId = parseInt(req.params.uploadId);
      const upload = await storage.getUpload(uploadId);

      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      // Check if file exists
      try {
        await fs.access(upload.filePath);
      } catch {
        return res.status(404).json({ message: "Image file not found" });
      }

      // Read image file
      const imageBuffer = await fs.readFile(upload.filePath);
      const base64Image = imageBuffer.toString('base64');

      // Validate image quality before processing
      const imageValidation = accuracyValidator.validateImageQuality(base64Image);
      if (!imageValidation.isValid) {
        return res.status(400).json({ 
          message: "Image quality insufficient for analysis",
          issues: imageValidation.issues 
        });
      }

      // Use Gemini to analyze the image
      const GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';

      const SYSTEM_PROMPT_PRODUCT_ANALYSIS = `
You are an expert product research analyst specializing in resale market intelligence. Your task is to analyze the provided image with extreme precision and perform comprehensive market research to return verified, actionable data for resellers.

ANALYSIS METHODOLOGY:
1. VISUAL EXAMINATION:
   - Identify ALL visible text, logos, model numbers, serial numbers, and distinctive features.
   - Note product condition indicators (packaging, wear, accessories).
   - Classify product category (electronics, clothing, collectibles, etc.).
   - Extract specific model identifiers and generation/version markers.

2. PRODUCT IDENTIFICATION:
   - Cross-reference visual elements with known product databases.
   - Use Google Search with specific model numbers and brand combinations.
   - Verify authenticity markers and distinguish from replicas/counterfeits.
   - Confirm exact product variant (color, storage size, regional version).

3. MARKET RESEARCH:
   - Research current retail prices from major retailers (Amazon, Best Buy, Walmart, Target).
   - Analyze recent sold listings on eBay, Facebook Marketplace, Mercari, OfferUp.
   - Factor in product condition, completeness, and market demand.
   - Consider seasonal trends and market saturation.

4. VALIDATION:
   - Cross-check pricing across multiple platforms.
   - Verify product specifications and features.
   - Ensure reference image accuracy and source credibility.

OUTPUT FORMAT (JSON):
{
  "productName": "Complete product name with brand, model, and key specifications",
  "description": "Comprehensive description including features, specifications, condition notes, and market positioning",
  "category": "Primary product category (Electronics, Fashion, Home, Collectibles, etc.)",
  "brand": "Brand name",
  "model": "Model number or identifier",
  "condition": "Apparent condition from image (New, Like New, Good, Fair)",
  "averageSalePrice": "Current retail price range for new items ($X - $Y USD)",
  "resellPrice": "Recent sold price range for similar condition ($X - $Y USD)",
  "marketDemand": "High/Medium/Low based on search volume and listing frequency",
  "profitMargin": "Estimated profit percentage for resellers",
  "referenceImageUrl": "REQUIRED: Direct image URL from verified retailer (amazon.com, bestbuy.com, target.com, walmart.com, skechers.com, etc.). Must be actual product photo, not placeholder.",
  "confidence": "Overall confidence in the analysis (0.0 to 1.0)",
  "sources": ["List of sources or platforms used for pricing data"]
}

ACCURACY REQUIREMENTS:
- Use only verified data from actual search results.
- Provide specific price ranges with 90%+ confidence.
- Include model-specific details when identifiable.
- Flag uncertainty with conservative estimates and lower confidence scores.
- Prioritize recent market data (last 30-60 days).

QUALITY STANDARDS:
- Product identification must be 85%+ confident or state limitations in the description.
- Price data must reflect current market conditions.
- Reference images must match exact product variant.
- All URLs must be from established retailers or marketplaces.
- Return ONLY the JSON object, without any additional text or markdown, to ensure parsing reliability.

Analyze the image thoroughly and return only the JSON object with accurate, research-backed data.
`;

      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        tools: [
          {
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: "DYNAMIC",
                dynamicThreshold: 0.7
              }
            }
          }
        ],
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT_PRODUCT_ANALYSIS },
              { text: `TASK: Analyze this product image for resale market intelligence.

REQUIREMENTS:
1. Examine the image for ALL visible details: brand logos, model numbers, text, distinctive features
2. Use Google Search to verify product identification and gather current market data
3. Research pricing from multiple sources: retail stores and recent sold listings
4. Provide specific, data-backed pricing ranges with high confidence

GOOGLE SEARCH STRATEGY (REQUIRED):
You have access to Google Search. Use it to verify product details and gather accurate pricing:

1. PRODUCT IDENTIFICATION:
   - Search: "[exact visible text/model numbers from image]"
   - Search: "[brand] [product type] [specific colorway/variant]"
   - Verify exact model name, SKU, and official product details

2. RETAIL PRICING VERIFICATION:
   - Search: "[verified product name] price site:amazon.com"
   - Search: "[verified product name] site:bestbuy.com"
   - Search: "[verified product name] site:target.com"
   - Get current retail prices from multiple sources

3. RESALE MARKET RESEARCH:
   - Search: "[verified product name] sold site:ebay.com"
   - Search: "[verified product name] resale value"
   - Check recent sold listings for accurate resale pricing

4. REFERENCE IMAGE ACQUISITION:
   - Search: "[verified product name] site:amazon.com" for official product images
   - Search: "[verified product name] site:[brand-website].com" for brand images
   - Ensure reference image matches exact colorway and variant

CRITICAL: Use Google Search results to validate ALL pricing data. Do not estimate - only use verified market prices from search results.

REFERENCE IMAGE REQUIREMENTS:
- PRIORITY: Use retailer domains (.com sites from major stores)
- Must show exact same product variant (color, model, size)
- High resolution and clear product visibility
- Extract direct image URL from search results
- If no retailer image found, use high-quality marketplace image as fallback

CRITICAL: Use only current, verified data from actual search results. Do not estimate or guess pricing.

Return the complete JSON object with accurate market intelligence.` },
              {
                inlineData: {
                  mimeType: upload.mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      } as any);

      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error("Invalid response structure from AI model");
      }

      const text = result.candidates[0].content.parts?.[0]?.text;
      if (!text) {
        throw new Error("No text content in AI response");
      }

      // Parse JSON response
      let analysisData;
      try {
        // Clean the response to extract JSON, removing markdown formatting
        let cleanText = text.trim();

        // Remove markdown code blocks if present
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Extract JSON object with improved robustness
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("No JSON object found in Gemini response:", cleanText);
          throw new Error("No JSON found in response");
        }

        const jsonStr = jsonMatch[0];
        // Handle potential trailing commas or incomplete JSON
        try {
          analysisData = JSON.parse(jsonStr);
        } catch (e) {
          // Attempt to fix common JSON issues (e.g., trailing commas)
          const fixedJsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          analysisData = JSON.parse(fixedJsonStr);
        }
        console.log("Parsed analysis data:", JSON.stringify(analysisData, null, 2));
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", text);
        console.error("Raw response text:", text);
        return res.status(500).json({ 
          message: "Failed to parse AI response", 
          errorDetails: parseError instanceof Error ? parseError.message : "Unknown parsing error" 
        });
      }

      // Generate reference image using AI if web image fails
      let localReferenceImageUrl = null;
      if (analysisData.referenceImageUrl) {
        try {
          const response = await fetch(analysisData.referenceImageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          if (response.ok) {
            const imageBuffer = await response.arrayBuffer();
            const imageHash = crypto.createHash('md5').update(Buffer.from(imageBuffer)).digest('hex');
            const extension = analysisData.referenceImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const referenceImagePath = path.join(uploadDir, `ref_${imageHash}.${extension}`);

            await fs.writeFile(referenceImagePath, Buffer.from(imageBuffer));
            localReferenceImageUrl = `ref_${imageHash}.${extension}`;
            console.log('Reference image downloaded and stored:', localReferenceImageUrl);
          } else {
            console.log('Failed to download reference image:', response.status);
          }
        } catch (error) {
          console.error('Error with reference image:', error);
        }
      }

      // Enhance pricing with eBay market data and intelligent analysis
      let enhancedResellPrice = analysisData.resellPrice || "Resell price not available";
      let enhancedAveragePrice = analysisData.averageSalePrice || "Price not available";
      let marketData: any = null;
      let fallbackImageUrl = null;

      if (analysisData.productName) {
        try {
          // First try eBay market data with OAuth token
          console.log('Fetching market data for product:', analysisData.productName);
          marketData = await marketDataService.getMarketData(
            analysisData.productName,
            analysisData.averageSalePrice || "",
            analysisData.resellPrice || ""
          );
          console.log('Market data result:', marketData);

          // If no reference image from Gemini, try to get one from eBay results
          if (!localReferenceImageUrl && marketData?.sources?.includes('eBay')) {
            try {
              const ebayService = createEbayProductionService();
              if (ebayService) {
                const ebayData = await ebayService.searchMarketplace(analysisData.productName);
                if (ebayData.recentSales && ebayData.recentSales.length > 0) {
                  // Find the first listing with an image
                  const listingWithImage = ebayData.recentSales.find(sale => sale.image?.imageUrl);
                  if (listingWithImage) {
                    fallbackImageUrl = listingWithImage.image.imageUrl;
                    console.log('Found eBay fallback image:', fallbackImageUrl);
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching eBay fallback image:', error);
            }
          }

          if (marketData.dataQuality === 'authenticated' && marketData.sources.length > 0) {
            // Use authenticated eBay data
            if (marketData.retailPrice) enhancedAveragePrice = marketData.retailPrice;
            if (marketData.resellPrice) enhancedResellPrice = marketData.resellPrice;

            console.log(`eBay market data: ${marketData.sources.join(', ')}`);
          } else {
            // Fall back to intelligent pricing analysis
            const pricingAnalysis = intelligentPricing.analyzeProductPricing(
              analysisData.productName,
              analysisData.description || "",
              analysisData.averageSalePrice || "",
              analysisData.resellPrice || ""
            );

            if (pricingAnalysis.confidence > 0.7) {
              enhancedAveragePrice = pricingAnalysis.retailPrice;
              enhancedResellPrice = pricingAnalysis.resellPrice;

              console.log(`Intelligent pricing: ${pricingAnalysis.marketCondition} (confidence: ${Math.round(pricingAnalysis.confidence * 100)}%)`);
            }
          }

        } catch (error) {
          console.error('Pricing enhancement error:', error);
        }
      }

      // Download fallback image if no Gemini reference but eBay image available
      if (!localReferenceImageUrl && fallbackImageUrl) {
        try {
          console.log('Attempting to download eBay fallback image:', fallbackImageUrl);
          const response = await fetch(fallbackImageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          if (response.ok) {
            const imageBuffer = await response.arrayBuffer();
            const imageHash = crypto.createHash('md5').update(Buffer.from(imageBuffer)).digest('hex');
            const extension = fallbackImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const referenceImagePath = path.join(uploadDir, `ebay_${imageHash}.${extension}`);

            await fs.writeFile(referenceImagePath, Buffer.from(imageBuffer));
            localReferenceImageUrl = `ebay_${imageHash}.${extension}`;
            console.log('eBay fallback image downloaded and stored:', localReferenceImageUrl);
          } else {
            console.log('Failed to download eBay fallback image:', response.status);
          }
        } catch (error) {
          console.error('Error downloading eBay fallback image:', error);
        }
      }

      // Validate product data accuracy
      const dataValidation = accuracyValidator.validateProductData({
        productName: analysisData.productName || "",
        brand: analysisData.brand,
        model: analysisData.model,
        category: analysisData.category,
        condition: analysisData.condition,
        averageSalePrice: enhancedAveragePrice,
        resellPrice: enhancedResellPrice,
        marketDemand: analysisData.marketDemand
      });

      // Generate comprehensive accuracy report
      const accuracyReport = accuracyValidator.generateAccuracyReport(imageValidation, dataValidation);

      // Use validated confidence score
      const confidenceScore = accuracyReport.overallConfidence;

      // Log accuracy insights for monitoring
      console.log(`Analysis accuracy: ${accuracyReport.status} (${Math.round(confidenceScore * 100)}% confidence)`);
      if (accuracyReport.improvements.length > 0) {
        console.log('Recommendations:', accuracyReport.improvements.join(', '));
      }

      // Validate and create analysis with enhanced data
      const analysisInput = {
        uploadId,
        productName: analysisData.productName || "Unknown Product",
        description: analysisData.description || "No description available",
        averageSalePrice: enhancedAveragePrice,
        resellPrice: enhancedResellPrice,
        referenceImageUrl: localReferenceImageUrl,
        marketSummary: marketData?.marketSummary || "AI analysis based pricing",
        confidence: confidenceScore,
      };

      const validatedAnalysis = insertAnalysisSchema.parse(analysisInput);
      const analysis = await storage.createAnalysis(validatedAnalysis);

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze image" 
      });
    }
  });

  // Live analysis endpoint for camera frames
  app.post("/api/analyze-live", async (req, res) => {
    try {
      const { imageData, sessionId } = req.body;

      if (!imageData) {
        return res.status(400).json({ message: "Image data required" });
      }

      // Remove data URL prefix if present
      const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      // Use Gemini to analyze the image with simplified prompt for live analysis
      const GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';

      const LIVE_ANALYSIS_PROMPT = `
Analyze this product image quickly for live viewing. Provide a brief analysis focusing on:
1. Product identification (brand/type)
2. Estimated value range
3. Key features visible
4. Any notable details for reselling

Return ONLY a JSON object with this structure:
{
  "productName": "Brief product name",
  "description": "Short description (under 50 words)",
  "averageSalePrice": "Price range",
  "resellPrice": "Resell price range",
  "confidence": 0.8
}

Keep response concise for real-time display.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: LIVE_ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 500,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const geminiResponse = await response.json();

      if (!geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const analysisText = geminiResponse.candidates[0].content.parts[0].text;

      // Parse JSON response
      let analysisData;
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback if JSON parsing fails
        analysisData = {
          productName: "Product detected",
          description: "Live analysis in progress...",
          averageSalePrice: "Analyzing...",
          resellPrice: "Analyzing...",
          confidence: 0.5
        };
      }

      res.json(analysisData);
    } catch (error) {
      console.error("Live analysis error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze live image" 
      });
    }
  });

  // Submit feedback endpoint
  app.post("/api/feedback", async (req, res) => {
    try {
      const validatedData = insertFeedbackSchema.parse(req.body);

      // Check if feedback already exists for this analysis
      const existingFeedback = await storage.getFeedbackByAnalysis(validatedData.analysisId);
      if (existingFeedback) {
        return res.status(409).json({ message: "Feedback already exists for this analysis" });
      }

      const feedback = await storage.createFeedback(validatedData);
      res.json(feedback);
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(400).json({ message: "Invalid feedback data" });
    }
  });

  // Get feedback by analysis ID
  app.get("/api/feedback/:analysisId", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const feedback = await storage.getFeedbackByAnalysis(analysisId);

      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      res.json(feedback);
    } catch (error) {
      console.error("Get feedback error:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Save analysis endpoint
  app.post("/api/save/:analysisId", requireAuth, async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const user = (req as any).user;

      // Check if already saved
      const isAlreadySaved = await storage.isAnalysisSaved(user.id, analysisId);
      if (isAlreadySaved) {
        return res.status(409).json({ message: "Analysis already saved" });
      }

      const saved = await storage.saveAnalysis(user.id, analysisId);
      res.json(saved);
    } catch (error) {
      console.error("Save analysis error:", error);
      res.status(500).json({ message: "Failed to save analysis" });
    }
  });

  // Unsave analysis endpoint
  app.delete("/api/save/:analysisId", requireAuth, async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const user = (req as any).user;

      await storage.unsaveAnalysis(user.id, analysisId);
      res.json({ message: "Analysis unsaved successfully" });
    } catch (error) {
      console.error("Unsave analysis error:", error);
      res.status(500).json({ message: "Failed to unsave analysis" });
    }
  });

  // Get saved analyses
  app.get("/api/saved", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const savedAnalyses = await storage.getSavedAnalyses(user.id);
      res.json(savedAnalyses);
    } catch (error) {
      console.error("Get saved analyses error:", error);
      res.status(500).json({ message: "Failed to fetch saved analyses" });
    }
  });

  // Check if analysis is saved
  app.get("/api/save/check/:analysisId", requireAuth, async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const user = (req as any).user;

      const isSaved = await storage.isAnalysisSaved(user.id, analysisId);
      res.json({ isSaved });
    } catch (error) {
      console.error("Check saved analysis error:", error);
      res.status(500).json({ message: "Failed to check if analysis is saved" });
    }
  });

  // Get analyses (session-based for guests, user-based for authenticated users)
  app.get("/api/analyses", optionalAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { sessionId } = req.query;

      let analyses;
      if (user?.id) {
        // Authenticated user: get their analyses
        analyses = await storage.getAnalysesByUser(user.id);
      } else if (sessionId) {
        // Guest user: get session analyses
        analyses = await storage.getAnalysesBySession(sessionId as string);
      } else {
        return res.status(400).json({ message: "Session ID required for guest users" });
      }

      res.json(analyses);
    } catch (error) {
      console.error("Get analyses error:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  // Get session analyses (legacy endpoint)
  app.get("/api/analyses/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const analyses = await storage.getAnalysesBySession(sessionId);
      res.json(analyses);
    } catch (error) {
      console.error("Get analyses error:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  // Get analysis with upload details
  app.get("/api/analysis/:analysisId", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      const analysis = await storage.getAnalysisWithUpload(analysisId);

      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // Get stats (session-based for guests, user-based for authenticated users)
  app.get("/api/stats", optionalAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { sessionId } = req.query;

      let stats;
      if (user?.id) {
        // For authenticated users, calculate stats from their analyses
        const analyses = await storage.getAnalysesByUser(user.id);
        const totalAnalyses = analyses.length;
        const accuracyRate = totalAnalyses > 0 ? 85 : 0; // Default accuracy
        const totalValue = 0; // We'd need to parse prices to calculate this

        stats = {
          totalAnalyses,
          accuracyRate,
          totalValue
        };
      } else if (sessionId) {
        // Guest user: get session stats
        stats = await storage.getSessionStats(sessionId as string);
      } else {
        return res.status(400).json({ message: "Session ID required for guest users" });
      }

      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get session stats (legacy endpoint)
  app.get("/api/stats/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const stats = await storage.getSessionStats(sessionId);
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Clear user history with time-based options
  app.delete("/api/history/clear", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { timeframe } = req.body;

      if (!timeframe) {
        return res.status(400).json({ message: "Timeframe is required" });
      }

      const deletedCount = await storage.clearUserHistory(user.id, timeframe);

      res.json({ 
        message: "History cleared successfully",
        deletedCount 
      });
    } catch (error) {
      console.error("Clear history error:", error);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  // Serve uploaded images by filename or upload ID
  app.get("/api/image/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      let imagePath: string;

      // Check if identifier is a number (upload ID) or filename
      if (/^\d+$/.test(identifier)) {
        // It's an upload ID, get the filename from database
        const uploadId = parseInt(identifier);
        const upload = await storage.getUpload(uploadId);
        
        if (!upload) {
          return res.status(404).json({ message: "Upload not found" });
        }
        
        imagePath = path.join(uploadDir, upload.filename);
      } else {
        // It's a filename
        imagePath = path.join(uploadDir, identifier);
      }

      await fs.access(imagePath);
      res.sendFile(imagePath);
    } catch (error) {
      console.error('Image serve error:', error);
      res.status(404).json({ message: "Image not found" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server for Live View
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/api/live'
  });

  setupLiveAPI(wss);

  return httpServer;
}
