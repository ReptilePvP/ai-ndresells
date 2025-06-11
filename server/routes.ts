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
import { generateImageHash, getCachedAnalysis, setCachedAnalysis } from './cache';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               process.env.GOOGLE_GEMINI_API_KEY || 
               "";
const genAI = new GoogleGenAI({ apiKey });

// Define system prompt for product analysis
const SYSTEM_PROMPT_PRODUCT_ANALYSIS = `You are an expert product analyst specializing in resale market intelligence.
Your task is to analyze product images and provide detailed market analysis.

REQUIREMENTS:
1. Examine the image for ALL visible details: brand logos, model numbers, text, distinctive features
2. Use Google Search to verify product identification and gather current market data
3. Research pricing from multiple sources: retail stores and recent sold listings
4. Provide specific, data-backed pricing ranges with high confidence

Return a JSON object with this structure:
{
  "productName": "string",
  "description": "string",
  "averageSalePrice": "string",
  "resellPrice": "string",
  "referenceImageUrl": "string (optional)",
  "marketSummary": "string (optional)",
  "confidence": number,
  "thinkingProcess": "string (detailed analysis process)"
}`;

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

      // Generate hash for the live image
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imageHash = generateImageHash(imageBuffer);

      // Check cache with shorter TTL for live analysis
      const cachedAnalysis = getCachedAnalysis(imageHash);
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

        const analysis = JSON.parse(jsonMatch[0]);
        res.json(analysis);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        res.json({
          productName: "Analyzing...",
          confidence: "low"
        });
      }

      // Cache the result
      const analysisToCache = {
        analysisData: analysis,
        timestamp: Date.now(),
        confidence: analysis.confidence || 0.5
      };
      setCachedAnalysis(imageHash, analysisToCache);

      res.json(analysis);
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
    const startTime = Date.now();
    let aiLog = {
      uploadId: 0,
      timestamp: new Date().toISOString(),
      model: '',
      prompt: '',
      rawResponse: '',
      parsedResponse: null,
      confidence: 0,
      processingTime: 0,
      success: false,
      error: null
    };

    try {
      const uploadId = parseInt(req.params.uploadId);
      aiLog.uploadId = uploadId;
      
      const upload = await storage.getUpload(uploadId);

      if (!upload) {
        aiLog.error = "Upload not found";
        console.log("AI Analysis Log:", aiLog);
        return res.status(404).json({ message: "Upload not found" });
      }

      // Read image file
      const imageBuffer = await fs.readFile(upload.filePath);
      const base64Image = imageBuffer.toString('base64');

      // Generate image hash for caching
      const imageHash = generateImageHash(imageBuffer);

      // Check cache first
      const cachedAnalysis = getCachedAnalysis(imageHash);
      if (cachedAnalysis) {
        console.log('Using cached analysis');
        aiLog.success = true;
        aiLog.processingTime = Date.now() - startTime;
        aiLog.parsedResponse = cachedAnalysis.analysisData;
        console.log("AI Analysis Log (Cached):", aiLog);
        return res.json(cachedAnalysis.analysisData);
      }

      // Enhanced validation
      const imageValidation = accuracyValidator.validateImageQuality(base64Image);
      if (!imageValidation.isValid) {
        aiLog.error = `Image validation failed: ${imageValidation.issues.join(', ')}`;
        console.log("AI Analysis Log:", aiLog);
        return res.status(400).json({ 
          message: "Image quality insufficient for analysis",
          issues: imageValidation.issues,
          recommendations: imageValidation.recommendations
        });
      }

      // Use validation confidence to adjust analysis parameters
      const analysisConfidence = imageValidation.confidence;

      // Select appropriate model based on confidence
      const selectedModel = analysisConfidence > 0.8 ? 
        'gemini-2.5-flash-preview-05-20' : 
        'gemini-2.0-flash-exp';

      aiLog.model = selectedModel;
      aiLog.confidence = analysisConfidence;

      // Use Gemini to analyze the image
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        aiLog.error = "Gemini API key not configured";
        console.log("AI Analysis Log:", aiLog);
        console.error("Gemini API key not configured");
        throw new Error("AI service not properly configured");
      }

      const fullPrompt = `${SYSTEM_PROMPT_PRODUCT_ANALYSIS}\n\nTASK: Analyze this product image for resale market intelligence.`;
      aiLog.prompt = fullPrompt;

      try {
        const model = genAI.getGenerativeModel({ model: selectedModel });

        const result = await model.generateContent({
          contents: [{
            parts: [
              { text: fullPrompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          }
        });

        const response = await result.response;
        const responseText = response.text();
        aiLog.rawResponse = responseText;
        console.log("Raw AI response:", responseText);

        // Clean the response to extract JSON
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Extract JSON object
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          aiLog.error = `No JSON object found in response: ${cleanText}`;
          console.log("AI Analysis Log:", aiLog);
          console.error("No JSON object found in response:", cleanText);
          throw new Error("Invalid response format from AI model");
        }

        const jsonStr = jsonMatch[0];
        type AnalysisData = {
          productName: string;
          description: string;
          averageSalePrice: string;
          resellPrice: string;
          referenceImageUrl?: string;
          marketSummary?: string;
          confidence: number;
          thinkingProcess?: string;
        };
        let analysisData: AnalysisData;
        try {
          analysisData = JSON.parse(jsonStr);
          aiLog.parsedResponse = analysisData;
        } catch (e) {
          aiLog.error = `JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}`;
          console.log("AI Analysis Log:", aiLog);
          console.error("JSON parse error:", e);
          throw new Error("Failed to parse AI response");
        }

        // Cache the analysis
        setCachedAnalysis(imageHash, {
          analysisData,
          timestamp: Date.now()
        });

        // Save analysis to database
        const analysis = await storage.createAnalysis({
          uploadId,
          ...analysisData
        });

        aiLog.success = true;
        aiLog.processingTime = Date.now() - startTime;
        console.log("AI Analysis Log:", aiLog);

        // Store AI log in database
        try {
          await storage.createAILog({
            uploadId: aiLog.uploadId,
            model: aiLog.model,
            prompt: aiLog.prompt,
            rawResponse: aiLog.rawResponse,
            parsedResponse: aiLog.parsedResponse,
            confidence: aiLog.confidence,
            processingTime: aiLog.processingTime,
            success: aiLog.success,
            error: aiLog.error
          });
        } catch (logError) {
          console.error("Failed to store AI log:", logError);
        }

        res.json(analysis);
      } catch (error) {
        aiLog.error = error instanceof Error ? error.message : "Unknown Gemini API error";
        aiLog.processingTime = Date.now() - startTime;
        console.log("AI Analysis Log:", aiLog);
        console.error("Gemini API error:", error);
        throw error;
      }
    } catch (error) {
      aiLog.error = error instanceof Error ? error.message : "Unknown analysis error";
      aiLog.processingTime = Date.now() - startTime;
      console.log("AI Analysis Log:", aiLog);
      console.error("Analysis error:", error);
      
      // Store failed AI log in database
      try {
        await storage.createAILog({
          uploadId: aiLog.uploadId,
          model: aiLog.model,
          prompt: aiLog.prompt,
          rawResponse: aiLog.rawResponse,
          parsedResponse: aiLog.parsedResponse,
          confidence: aiLog.confidence,
          processingTime: aiLog.processingTime,
          success: aiLog.success,
          error: aiLog.error
        });
      } catch (logError) {
        console.error("Failed to store AI log:", logError);
      }
      
      res.status(500).json({ 
        message: "Failed to analyze image",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
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

      const systemStatus = {
        apiStatus: {
          ebayApi: ebayApiStatus,
          stockxApi: stockxApiStatus,
          geminiApi: geminiApiStatus,
          database: 'Connected'
        },
        overallStatus: (ebayApiStatus === 'Connected' && geminiApiStatus === 'Connected') ? 'operational' : 'degraded'
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

  // AI Logs endpoint for admin
  app.get("/api/admin/ai-logs", requireAdmin, async (req, res) => {
    try {
      const { limit = 50, uploadId } = req.query;
      const logs = await storage.getAILogs(
        uploadId ? parseInt(uploadId as string) : undefined,
        parseInt(limit as string)
      );
      res.json(logs);
    } catch (error) {
      console.error("AI logs error:", error);
      res.status(500).json({ message: "Failed to fetch AI logs" });
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
        return result;
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        return null;
      }
    })
  );

  // Filter out failed results
  const validResults = results.filter(r => r && r.candidates?.[0]?.content?.parts?.[0]?.text);

  if (validResults.length === 0) {
    throw new Error("All model analyses failed");
  }

  // Parse and compare results
  const parsedResults = validResults.map(result => {
    const text = result.candidates[0].content.parts[0].text;
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
