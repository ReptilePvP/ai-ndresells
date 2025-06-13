import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
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
import { Client } from "@replit/object-storage";
import { objectStorageService } from './object-storage';
import { createEbayService } from './ebay-api';
import { createEbayProductionService } from './ebay-production-auth';
import { createEcommerceService, createGoogleShoppingService, createAmazonService } from './ecommerce-platforms';
import { createPricingAggregator } from './pricing-aggregator';
import { createMarketDataService } from './market-data-service';
import { createIntelligentPricing } from './intelligent-pricing';
import { accuracyValidator } from './accuracy-validator';
import { generateImageHash, getCachedAnalysis, setCachedAnalysis, hasNegativeFeedback, clearSpecificCache } from './cache';
import { multiAPIAnalyzer } from './multi-api-analyzer';

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
const client = new Client();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directories exist
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
  // StockX API routes disabled
  app.get('/api/auth/stockx/authorize', (req, res) => {
    res.status(503).json({ error: 'StockX API temporarily disabled' });
  });

  app.get('/api/auth/stockx/callback', (req, res) => {
    res.redirect('/?auth_error=stockx_disabled');
  });

  app.get('/api/stockx/auth/status', (req, res) => {
    res.json({ 
      authenticated: false, 
      needsAuthorization: false,
      disabled: true,
      message: 'StockX API temporarily disabled'
    });
  });

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

  app.put("/api/auth/update-email", requireAuth, async (req, res) => {
    try {
      const { email, currentPassword } = req.body;
      const user = (req as any).user;

      if (!email || !currentPassword) {
        return res.status(400).json({ message: "Email and current password are required" });
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Check if email is already taken
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ message: "Email is already in use" });
      }

      // Update email
      const updatedUser = await storage.updateUserEmail(user.id, email);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      const { password: _, ...userWithoutPassword } = updatedUser as any;
      
      res.json({ user: userWithoutPassword, message: "Email updated successfully" });
    } catch (error) {
      console.error("Update email error:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  app.put("/api/auth/update-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = (req as any).user;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUserPassword(user.id, hashedNewPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.put("/api/auth/update-api-provider", requireAuth, async (req, res) => {
    try {
      const { apiProvider } = req.body;
      const user = (req as any).user;

      if (!apiProvider || !['gemini', 'searchapi', 'serpapi'].includes(apiProvider)) {
        return res.status(400).json({ message: "Valid API provider is required (gemini, searchapi, or serpapi)" });
      }

      // Update API provider
      const updatedUser = await storage.updateUserApiProvider(user.id, apiProvider);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      const { password: _, ...userWithoutPassword } = updatedUser as any;
      
      res.json({ user: userWithoutPassword, message: "API provider updated successfully" });
    } catch (error) {
      console.error("Update API provider error:", error);
      res.status(500).json({ message: "Failed to update API provider" });
    }
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

      // Test Database connection
      let databaseStatus = 'Unknown';
      try {
        const { testDatabaseConnection } = await import('./db');
        const isConnected = await testDatabaseConnection();
        databaseStatus = isConnected ? 'Connected' : 'Error';
      } catch (error) {
        console.error('Database connection test failed:', error);
        databaseStatus = 'Error';
      }

      const enhancedStats = {
        ...stats,
        apiStatus: {
          ebayApi: ebayApiStatus,
          stockxApi: stockxApiStatus,
          geminiApi: geminiApiStatus,
          database: databaseStatus
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

      // Generate hash for the live image
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imageHash = generateImageHash(imageBuffer);

      // Check cache with shorter TTL for live analysis (live analysis uses gemini)
      const liveApiProvider = 'gemini';
      const cachedAnalysis = getCachedAnalysis(imageHash, liveApiProvider);
      if (cachedAnalysis && (Date.now() - cachedAnalysis.timestamp) < 300000) { // 5 minutes TTL for live
        console.log('Using cached live analysis');
        return res.json(cachedAnalysis.analysisData);
      }

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

        const analysisData = JSON.parse(jsonMatch[0]);
        res.json(analysisData);

        // Cache the result with API provider
        const analysisToCache = {
          analysisData: analysisData,
          timestamp: Date.now(),
          confidence: analysisData.confidence || 0.5
        };
        setCachedAnalysis(imageHash, analysisToCache, liveApiProvider);
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
        message: error instanceof Error ? error.message : "Failed to analyze live image" 
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
      
      // Read the uploaded file into a buffer
      const fileBuffer = await fs.readFile(req.file.path);

      // Upload to Replit Bucket
      const { ok, error } = await client.uploadFromBytes(
        req.file.filename, 
        fileBuffer
      );

      if (!ok) {
        throw new Error(`Failed to upload to bucket: ${error}`);
      }

      // TODO: Get public URL. This is not in the provided documentation.
      // For now, we will construct a placeholder URL.
      const publicUrl = `https://replit.com/data/buckets/${process.env.REPL_ID}/${req.file.filename}`;
      
      const uploadData = {
        userId: user?.id || null,
        sessionId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path, // Keep original path for reference
        publicUrl: publicUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      };

      const validatedData = insertUploadSchema.parse(uploadData);
      const upload = await storage.createUpload(validatedData);

      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json(upload);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Fallback analysis endpoint when user chooses to retry with Gemini
  app.post("/api/analyze/:uploadId/fallback", optionalAuth, async (req, res) => {
    try {
      const uploadId = parseInt(req.params.uploadId);
      const { originalProvider } = req.body;
      
      if (!originalProvider || !['searchapi', 'serpapi'].includes(originalProvider)) {
        return res.status(400).json({ message: "Valid original provider required for fallback" });
      }

      const upload = await storage.getUpload(uploadId);
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      // Read image file
      const imageBuffer = await fs.readFile(upload.filePath);
      const base64Image = imageBuffer.toString('base64');

      console.log(`Processing fallback analysis from ${originalProvider} to Gemini`);
      
      // Use fallback method
      const analysisData = await multiAPIAnalyzer.analyzeImageWithFallback(
        base64Image,
        originalProvider,
        upload
      );

      console.log("Fallback analysis completed:", {
        originalProvider,
        fallbackProvider: 'gemini',
        productName: analysisData.productName,
        confidence: analysisData.confidence
      });

      // Continue with the same processing as regular analysis...
      let localReferenceImageUrl: string | null = null;
      let fallbackImageUrl: string | null = null;
      let marketData: any = null;
      let enhancedResellPrice = analysisData.resellPrice || "Resell price not available";
      let enhancedAveragePrice = analysisData.averageSalePrice || "Price not available";

      // Fetch market data if we have a product name
      if (analysisData.productName) {
        try {
          console.log('Fetching market data for product:', analysisData.productName);
          marketData = await marketDataService.getMarketData(
            analysisData.productName,
            analysisData.averageSalePrice || "",
            analysisData.resellPrice || ""
          );

          // Update pricing based on market data
          if (marketData.dataQuality === 'authenticated' && marketData.sources.length > 0) {
            if (marketData.retailPrice) enhancedAveragePrice = marketData.retailPrice;
            if (marketData.resellPrice) enhancedResellPrice = marketData.resellPrice;
          }
        } catch (error) {
          console.error('Market data enhancement error:', error);
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
        marketSummary: marketData?.marketSummary || "AI analysis based pricing",
        confidence: analysisData.confidence || 0.7,
        thoughtProcess: analysisData.thoughtProcess || "Fallback analysis completed."
      };

      const validatedAnalysis = insertAnalysisSchema.parse(analysisInput);
      const analysis = await storage.createAnalysis(validatedAnalysis);

      res.json(analysis);
    } catch (error) {
      console.error("Fallback analysis error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to perform fallback analysis" 
      });
    }
  });

  // Analyze product endpoint
  app.post("/api/analyze/:uploadId", optionalAuth, async (req, res) => {
    try {
      const uploadId = parseInt(req.params.uploadId);
      const upload = await storage.getUpload(uploadId);

      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      // Get user's preferred API provider
      const user = (req as any).user;
      let apiProvider: 'gemini' | 'searchapi' | 'serpapi' = 'gemini'; // default
      
      if (user && user.apiProvider) {
        apiProvider = user.apiProvider;
      }

      // Read image file
      const imageBuffer = await fs.readFile(upload.filePath);
      const base64Image = imageBuffer.toString('base64');

      // Generate image hash for caching
      const imageHash = generateImageHash(imageBuffer);

      // Check cache first with API provider, but also check if this image has received negative feedback before
      const cachedAnalysis = getCachedAnalysis(imageHash, apiProvider);
      if (cachedAnalysis) {
        // Check if any previous analysis of this image hash received negative feedback
        if (!hasNegativeFeedback(imageHash)) {
          console.log(`Using cached analysis for ${apiProvider}`);
          return res.json(cachedAnalysis.analysisData);
        } else {
          console.log('Cache found but image has negative feedback history - performing fresh analysis');
        }
      }

      // Enhanced validation
      const imageValidation = accuracyValidator.validateImageQuality(base64Image);
      if (!imageValidation.isValid) {
        return res.status(400).json({ 
          message: "Image quality insufficient for analysis",
          issues: imageValidation.issues,
          recommendations: imageValidation.recommendations
        });
      }

      // Use validation confidence to adjust analysis parameters
      const analysisConfidence = imageValidation.confidence;

      // Select appropriate model based on confidence
      const model = analysisConfidence > 0.8 ? 
        'gemini-2.5-flash-preview-05-20' : 
        'gemini-2.0-flash-exp';

      console.log(`Using ${apiProvider} for image analysis`);
      
      // Use the multi-API analyzer
      let analysisData;
      try {
        analysisData = await multiAPIAnalyzer.analyzeImage(
          base64Image, 
          apiProvider,
          upload
        );

        console.log("Multi-API analysis completed:", {
          apiProvider: analysisData.apiProvider,
          productName: analysisData.productName,
          confidence: analysisData.confidence
        });
      } catch (error: any) {
        // Check if this is a fallback suggestion error
        if (error.suggestFallback && apiProvider !== 'gemini') {
          return res.status(422).json({
            error: 'api_failed',
            message: `${apiProvider} analysis failed. Would you like to try with Gemini instead?`,
            suggestFallback: true,
            failedProvider: apiProvider,
            originalError: error.originalError?.message || error.message
          });
        }
        throw error;
      }

      // Initialize all variables at the start
      let localReferenceImageUrl: string | null = null;
      let fallbackImageUrl: string | null = null;
      let marketData: any = null;
      let enhancedResellPrice = analysisData.resellPrice || "Resell price not available";
      let enhancedAveragePrice = analysisData.averageSalePrice || "Price not available";

      // Fetch market data if we have a product name
      if (analysisData.productName) {
        try {
          console.log('Fetching market data for product:', analysisData.productName);
          marketData = await marketDataService.getMarketData(
            analysisData.productName,
            analysisData.averageSalePrice || "",
            analysisData.resellPrice || ""
          );
          console.log('Market data result:', marketData);

          // Try to get a reference image from eBay if available
          if (marketData?.sources?.includes('eBay')) {
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

          // Update pricing based on market data
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
          console.error('Market data and pricing enhancement error:', error);
        }
      }

      // Try to download reference image from Gemini's URL first
      if (analysisData.referenceImageUrl) {
        try {
          console.log('Attempting to download reference image:', analysisData.referenceImageUrl);
          const response = await fetch(analysisData.referenceImageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': 'https://www.footlocker.com/',
              'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            }
          });

          if (response.ok) {
            const imageBuffer = await response.arrayBuffer();
            const imageHash = crypto.createHash('md5').update(Buffer.from(imageBuffer)).digest('hex');
            const extension = analysisData.referenceImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const referenceImagePath = path.join(uploadDir, `ref_${imageHash}.${extension}`);

            // Ensure the upload directory exists
            await fs.mkdir(uploadDir, { recursive: true });

            // Write the file
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

      // If no reference image from Gemini, try the eBay fallback
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

            // Ensure the upload directory exists
            await fs.mkdir(uploadDir, { recursive: true });

            // Write the file
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

      // Validate and create analysis with enhanced data, including thoughtProcess
      const analysisInput = {
        uploadId,
        productName: analysisData.productName || "Unknown Product",
        description: analysisData.description || "No description available",
        averageSalePrice: enhancedAveragePrice,
        resellPrice: enhancedResellPrice,
        referenceImageUrl: localReferenceImageUrl,
        marketSummary: marketData?.marketSummary || "AI analysis based pricing",
        confidence: confidenceScore,
        thoughtProcess: analysisData.thoughtProcess || "No detailed thought process provided."
      };

      const validatedAnalysis = insertAnalysisSchema.parse(analysisInput);
      const analysis = await storage.createAnalysis(validatedAnalysis);

      // After getting the analysis result, cache it with API provider
      const analysisToCache = {
        analysisData: analysis,
        timestamp: Date.now(),
        confidence: confidenceScore
      };
      setCachedAnalysis(imageHash, analysisToCache, apiProvider);

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

      // If feedback is negative (not accurate), invalidate cache for this analysis
      if (!validatedData.isAccurate) {
        try {
          const analysis = await storage.getAnalysisWithUpload(validatedData.analysisId);
          if (analysis && analysis.upload) {
            // Read the original image to generate hash
            const imageBuffer = await fs.readFile(analysis.upload.filePath);
            const imageHash = generateImageHash(imageBuffer);
            
            // Remove from cache so future uploads get fresh analysis
            clearSpecificCache(imageHash);
            
            console.log(`Cache invalidated for analysis ${validatedData.analysisId} due to negative feedback`);
          }
        } catch (cacheError) {
          console.error("Failed to invalidate cache:", cacheError);
          // Don't fail the feedback submission if cache invalidation fails
        }
      }

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

  // Public system status endpoint
  app.get("/api/system/status", async (req, res) => {
    try {
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

      // Test Database connection
      let databaseStatus = 'Unknown';
      try {
        const { testDatabaseConnection } = await import('./db');
        const isConnected = await testDatabaseConnection();
        databaseStatus = isConnected ? 'Connected' : 'Error';
      } catch (error) {
        console.error('Database connection test failed:', error);
        databaseStatus = 'Error';
      }

      const systemStatus = {
        apiStatus: {
          ebayApi: ebayApiStatus,
          stockxApi: stockxApiStatus,
          geminiApi: geminiApiStatus,
          database: databaseStatus
        },
        overallStatus: (ebayApiStatus === 'Connected' && geminiApiStatus === 'Connected' && databaseStatus === 'Connected') ? 'operational' : 'degraded'
      };

      res.json(systemStatus);
    } catch (error) {
      console.error("System status error:", error);
      res.status(500).json({ message: "Failed to fetch system status" });
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
        // It's a filename - handle both regular uploads and reference images
        if (identifier.startsWith('ref_') || identifier.startsWith('ebay_')) {
          // Reference image
          imagePath = path.join(uploadDir, identifier);
        } else {
          // Regular upload
          imagePath = path.join(uploadDir, identifier);
        }
      }

      // Check if file exists
      try {
        await fs.access(imagePath);
      } catch (error) {
        console.error('Image file not found:', imagePath);
        return res.status(404).json({ message: "Image not found" });
      }

      // Set appropriate content type based on file extension
      const ext = path.extname(imagePath).toLowerCase();
      const contentType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      }[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.sendFile(imagePath);
    } catch (error) {
      console.error('Image serve error:', error);
      res.status(500).json({ message: "Failed to serve image" });
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

async function getMultiModelAnalysis(base64Image: string) {
  const models = [
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash-exp'
  ];

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
  "sources": ["List of sources or platforms used for pricing data"],
  "thoughtProcess": "Provide a detailed step-by-step explanation of your reasoning and analysis process, including intermediate observations and decisions."
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

  const results = await Promise.all(
    models.map(async (model) => {
      try {
        const result = await genAI.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT_PRODUCT_ANALYSIS },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          }],
        });
        return result as any; // Type assertion to handle potential API response structure issues
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        return null;
      }
    })
  );

  // Filter out failed results
  const validResults = results.filter((r): r is any => {
    if (!r || !r.candidates || r.candidates.length === 0 || !r.candidates[0].content || !r.candidates[0].content.parts || r.candidates[0].content.parts.length === 0 || !r.candidates[0].content.parts[0]) {
      return false;
    }
    return typeof r.candidates[0].content.parts[0].text === 'string';
  });

  if (validResults.length === 0) {
    throw new Error("All model analyses failed");
  }

  // Parse and compare results
  const parsedResults = validResults.map(result => {
    const text = result.candidates[0].content.parts[0].text as string;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return null;
    }
  }).filter(r => r !== null);

  // If we have multiple valid results, compare them
  if (parsedResults.length > 1) {
    return compareAnalysisResults(parsedResults);
  }

  return parsedResults[0];
}

function compareAnalysisResults(results: any[]) {
  // Compare product names
  const productNames = results.map(r => r.productName.toLowerCase());
  const nameConsensus = getConsensus(productNames);

  // Compare prices
  const retailPrices = results.map(r => extractPriceRange(r.averageSalePrice));
  const resellPrices = results.map(r => extractPriceRange(r.resellPrice));

  // Get consensus prices
  const consensusRetail = getPriceConsensus(retailPrices);
  const consensusResell = getPriceConsensus(resellPrices);

  // Calculate confidence based on agreement
  const confidence = calculateConfidence(results, nameConsensus, consensusRetail, consensusResell);

  return {
    productName: nameConsensus,
    averageSalePrice: formatPriceRange(consensusRetail),
    resellPrice: formatPriceRange(consensusResell),
    confidence,
    agreement: {
      productName: getAgreementPercentage(productNames),
      retailPrice: getAgreementPercentage(retailPrices),
      resellPrice: getAgreementPercentage(resellPrices)
    }
  };
}

function getConsensus(items: string[]): string {
  // Count occurrences of each item
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find the most common item
  const maxCount = Math.max(...Object.values(counts));
  const consensus = Object.entries(counts)
    .filter(([_, count]) => count === maxCount)
    .map(([item]) => item);

  // If there's a clear winner, return it
  if (consensus.length === 1) {
    return consensus[0];
  }

  // If there's a tie, return the most detailed name
  return consensus.reduce((a, b) => a.length > b.length ? a : b);
}

function getPriceConsensus(prices: { min: number; max: number }[]) {
  const mins = prices.map(p => p.min);
  const maxs = prices.map(p => p.max);

  return {
    min: Math.min(...mins),
    max: Math.max(...maxs)
  };
}

function calculateConfidence(
  results: any[],
  nameConsensus: string,
  retailConsensus: { min: number; max: number },
  resellConsensus: { min: number; max: number }
): number {
  let confidence = 1.0;

  // Reduce confidence for name disagreements
  const nameAgreement = getAgreementPercentage(results.map(r => r.productName.toLowerCase()));
  confidence *= nameAgreement;

  // Reduce confidence for price disagreements
  const retailAgreement = getAgreementPercentage(results.map(r => extractPriceRange(r.averageSalePrice)));
  const resellAgreement = getAgreementPercentage(results.map(r => extractPriceRange(r.resellPrice)));

  confidence *= (retailAgreement + resellAgreement) / 2;

  return Math.max(0.1, Math.min(1.0, confidence));
}

function getAgreementPercentage(items: any[]): number {
  const uniqueItems = new Set(items.map(item => 
    typeof item === 'object' ? JSON.stringify(item) : item
  ));
  return 1 - ((uniqueItems.size - 1) / (items.length - 1));
}

function extractPriceRange(price: string): { min: number; max: number } {
  const [min, max] = price.split(' - ');
  return {
    min: parseFloat(min),
    max: parseFloat(max)
  };
}

function formatPriceRange(range: { min: number; max: number }): string {
  return `${range.min.toFixed(2)} - ${range.max.toFixed(2)}`;
}
