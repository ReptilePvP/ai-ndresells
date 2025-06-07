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
import { createEcommerceService, createGoogleShoppingService, createAmazonService } from './ecommerce-platforms';
import { createPricingAggregator } from './pricing-aggregator';

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
      res.json(stats);
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

      // Use Gemini to analyze the image
      const GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';

      const SYSTEM_PROMPT_PRODUCT_ANALYSIS = `
You are an expert product research analyst. Your task is to analyze the provided image to accurately identify the product, then perform real-time research using Google Search to return verified, up-to-date resale intelligence.

GOAL:
Return a structured JSON object with detailed and factual data for resale evaluation.

ALWAYS follow this output structure:
{
  "productName": "string (Full name including brand and model. E.g., 'Sony WH-1000XM4 Wireless Noise-Cancelling Headphones')",
  "description": "string (A rich, detailed product description covering features, specs, and common use cases. Write it like an Amazon product summary.)",
  "averageSalePrice": "string (Retail pricing range for NEW condition items from major stores like Amazon, Walmart, Best Buy. E.g., '$249 - $299 USD')",
  "resellPrice": "string (Recently SOLD listing prices for USED condition, based on eBay, Facebook Marketplace, Mercari, etc. Give a range like '$150 - $200 USD')",
  "referenceImageUrl": "string (URL to a high-quality matching product image from a trusted site like amazon.com/images/, ebayimg.com, walmart.com, or bestbuy.com)"
}

STEP-BY-STEP STRATEGY:
1. VISUAL IDENTITY:
  - Extract brand name, product type, and possible model number from the image.
  - Look for visual clues (logos, packaging, labels, colors, patterns).

2. PRODUCT CONFIRMATION:
  - Use Google Search to confirm identification (e.g., '[visual details] site:amazon.com').

3. PRICING RESEARCH:
  - Find current NEW prices from retailers using '[brand model] site:amazon.com OR site:walmart.com'.
  - Find SOLD prices for USED items using 'site:ebay.com "[brand model]" sold'.

4. REFERENCE IMAGE:
  - Find a clear, accurate product image from Amazon, eBay, or other major retail sources.
  - Prioritize URLs ending in jpg/png from:
    • amazon.com/images/
    • i.ebayimg.com
    • bestbuy.com
    • walmartimages.com

RULES:
- All data MUST be derived from actual search results — do NOT guess or fabricate.
- Only include ONE product in your analysis (the most prominent item in the image).
- If multiple possible matches exist, pick the one with the strongest visual and data alignment.

IF IN DOUBT:
Be conservative — prefer slightly generic but accurate identification over uncertain specifics.

This prompt should always be followed when analyzing product images for resale. Respond only with the completed JSON object.
`;

      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT_PRODUCT_ANALYSIS },
              { text: `Please analyze this product image and provide detailed resale information.

Your task:
- Identify the specific product shown in the image (brand, model, version).
- Look up verified information online to determine:
  • The product's name and description
  • Current retail price (brand new)
  • Current resale value (used/sold listings)
  • A matching high-quality product image from a trusted source

Only return your answer in the following JSON format:
{
  "productName": "...",
  "description": "...",
  "averageSalePrice": "...",
  "resellPrice": "...",
  "referenceImageUrl": "..."
}

Be accurate, concise, and use real data from Google Search and trusted sites like Amazon, eBay, Walmart, Best Buy, etc.` },
              {
                inlineData: {
                  mimeType: upload.mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        tools: [
          {
            googleSearch: {}
          }
        ]
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
        
        // Extract JSON object
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        analysisData = JSON.parse(jsonMatch[0]);
        console.log("Parsed analysis data:", JSON.stringify(analysisData, null, 2));
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", text);
        console.error("Raw response text:", text);
        return res.status(500).json({ message: "Failed to parse AI response" });
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

      // Enhance pricing with comprehensive e-commerce platform data
      let enhancedResellPrice = analysisData.resellPrice || "Resell price not available";
      let enhancedAveragePrice = analysisData.averageSalePrice || "Price not available";
      let marketDataSources: string[] = [];
      
      if (analysisData.productName) {
        try {
          console.log(`Fetching comprehensive market data for: ${analysisData.productName}`);
          
          // Parallel execution of multiple data sources
          const marketDataPromises = [];
          
          // eBay market data
          if (ebayService) {
            marketDataPromises.push(
              ebayService.getComprehensiveMarketData(analysisData.productName)
                .then(data => ({ source: 'eBay', data }))
                .catch(error => ({ source: 'eBay', error }))
            );
          }
          
          // Comprehensive e-commerce platform data
          marketDataPromises.push(
            ecommerceService.getComprehensivePricing(analysisData.productName)
              .then(data => ({ source: 'E-commerce', data }))
              .catch(error => ({ source: 'E-commerce', error }))
          );
          
          const marketResults = await Promise.allSettled(marketDataPromises);
          
          let totalPlatforms = 0;
          let totalCurrentPrice = 0;
          let platformCount = 0;
          let resellDataAvailable = false;
          
          for (const result of marketResults) {
            if (result.status === 'fulfilled' && result.value) {
              const resultValue = result.value as any;
              if (resultValue.error) {
                console.error(`${resultValue.source} API error:`, resultValue.error);
                continue;
              }
              
              const { source, data } = resultValue;
              
              if (source === 'eBay' && data.soldData.sampleSize > 0) {
                resellDataAvailable = true;
                const ebayResellData = data.marketInsights.recommendedResellPrice !== 'Unable to determine' 
                  ? data.marketInsights.recommendedResellPrice 
                  : data.soldData.priceRange;
                
                if (ebayResellData !== 'No recent sales found') {
                  enhancedResellPrice = `${ebayResellData} (eBay: ${data.soldData.sampleSize} sold, ${data.currentData.sampleSize} active)`;
                  marketDataSources.push(`eBay ${data.soldData.sampleSize + data.currentData.sampleSize} listings`);
                }
                
                if (data.currentData.averagePrice > 0) {
                  totalCurrentPrice += data.currentData.averagePrice;
                  platformCount++;
                }
              } else if (source === 'E-commerce' && data.platforms.length > 0) {
                totalPlatforms += data.platforms.length;
                
                if (data.marketSummary.averagePrice > 0) {
                  totalCurrentPrice += data.marketSummary.averagePrice;
                  platformCount++;
                  
                  marketDataSources.push(`${data.platforms.length} retail platforms`);
                  
                  if (!resellDataAvailable && data.marketSummary.recommendedResellPrice !== 'Insufficient market data') {
                    enhancedResellPrice = `${data.marketSummary.recommendedResellPrice} (estimated from retail)`;
                  }
                }
              }
            } else if (result.status === 'rejected') {
              console.error('Market data promise rejected:', result.reason);
            }
          }
          
          // Calculate enhanced average price from multiple sources
          if (platformCount > 0) {
            const averageMarketPrice = totalCurrentPrice / platformCount;
            enhancedAveragePrice = `$${Math.round(averageMarketPrice)} USD (avg from ${marketDataSources.join(', ')})`;
          }
          
          if (marketDataSources.length > 0) {
            console.log(`Market data enhancement: ${marketDataSources.join(', ')}`);
          }
          
        } catch (error) {
          console.error('Market data aggregation error:', error);
          // Continue with Gemini data if market data fails
        }
      }

      // Validate and create analysis
      const analysisInput = {
        uploadId,
        productName: analysisData.productName || "Unknown Product",
        description: analysisData.description || "No description available",
        averageSalePrice: enhancedAveragePrice,
        resellPrice: enhancedResellPrice,
        referenceImageUrl: localReferenceImageUrl,
        confidence: 0.85, // Default confidence
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

  // Serve uploaded images
  app.get("/api/image/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const imagePath = path.join(uploadDir, filename);
      
      await fs.access(imagePath);
      res.sendFile(imagePath);
    } catch {
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
