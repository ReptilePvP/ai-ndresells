import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertUploadSchema, insertAnalysisSchema, insertFeedbackSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLiveAPI } from "./live-api";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { multiAPIAnalyzer } from "./multi-api-analyzer";

import { accuracyValidator } from "./accuracy-validator";
import { createMarketDataService } from "./market-data-service";

const publicUploadDir = path.join(process.cwd(), "public", "uploads");

// Ensure the public uploads directory exists
(async () => {
  try {
    await fs.mkdir(publicUploadDir, { recursive: true });
    console.log("Public uploads directory ready:", publicUploadDir);
  } catch (error) {
    console.error("Error creating public uploads directory:", error);
  }
})();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve public uploads as static files
  app.use('/uploads', express.static(publicUploadDir));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes
  app.put("/api/auth/update-email", isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.body;
      const userId = req.user.claims.sub;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const updatedUser = await storage.updateUser(userId, { email });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Email update error:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  app.put("/api/auth/update-api-provider", isAuthenticated, async (req: any, res) => {
    try {
      const { apiProvider } = req.body;
      const userId = req.user.claims.sub;

      if (!apiProvider || !["gemini", "searchapi", "serpapi"].includes(apiProvider)) {
        return res.status(400).json({ message: "Valid API provider is required" });
      }

      const updatedUser = await storage.updateUser(userId, { apiProvider });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("API provider update error:", error);
      res.status(500).json({ message: "Failed to update API provider" });
    }
  });

  // Admin routes
  app.get("/api/admin/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const analytics = await storage.getAnalyticsData();
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Upload image endpoint
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const sessionId = req.sessionID || `session_${Date.now()}`;
      const userId = (req as any).user?.claims?.sub || null;

      // Validate upload data
      const uploadData = insertUploadSchema.parse({
        userId,
        sessionId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      });

      const upload = await storage.createUpload(uploadData);

      res.json({
        uploadId: upload.id,
        sessionId,
        filename: upload.filename,
        originalName: upload.originalName,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Enhanced analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { uploadId, sessionId } = req.body;

      if (!uploadId) {
        return res.status(400).json({ error: "Upload ID is required" });
      }

      const upload = await storage.getUpload(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      if (sessionId && upload.sessionId !== sessionId) {
        return res.status(403).json({ error: "Session mismatch" });
      }

      console.log(`Starting analysis for upload ${uploadId}`);

      // Read the uploaded image
      const imageBuffer = await fs.readFile(upload.filePath);
      const base64Image = imageBuffer.toString("base64");

      // Copy to public uploads for external API access
      const publicFilename = `${upload.filename}_${Date.now()}.jpg`;
      const publicPath = path.join(publicUploadDir, publicFilename);
      await fs.copyFile(upload.filePath, publicPath);
      const publicUrl = `/uploads/${publicFilename}`;

      // Get user's preferred API provider
      const userId = (req as any).user?.claims?.sub;
      let apiProvider = "gemini";
      if (userId) {
        const user = await storage.getUser(userId);
        apiProvider = user?.apiProvider || "gemini";
      }

      console.log(`Using API provider: ${apiProvider}`);

      // Run analysis with preferred provider
      const analysisResult = await multiAPIAnalyzer.analyzeImage(
        base64Image,
        apiProvider as "gemini" | "searchapi" | "serpapi",
        publicPath
      );

      // Enhanced market data
      const marketDataService = createMarketDataService();
      const marketData = await marketDataService.getMarketData(
        analysisResult.productName,
        analysisResult.averageSalePrice,
        analysisResult.resellPrice
      );

      // Validate accuracy
      const imageValidation = accuracyValidator.validateImageQuality(base64Image);
      const dataValidation = accuracyValidator.validateProductData({
        productName: analysisResult.productName,
        category: analysisResult.category,
        brand: analysisResult.brand,
        condition: analysisResult.condition,
        averageSalePrice: analysisResult.averageSalePrice,
        resellPrice: analysisResult.resellPrice,
      });

      const accuracyReport = accuracyValidator.generateAccuracyReport(
        imageValidation,
        dataValidation
      );

      // Store analysis in database
      const analysisData = insertAnalysisSchema.parse({
        uploadId: upload.id,
        productName: analysisResult.productName,
        description: analysisResult.description,
        averageSalePrice: marketData.retailPrice,
        resellPrice: marketData.resellPrice,
        referenceImageUrl: analysisResult.referenceImageUrl,
        marketSummary: marketData.marketSummary,
        confidence: analysisResult.confidence,
        thoughtProcess: analysisResult.thoughtProcess,
      });

      const analysis = await storage.createAnalysis(analysisData);

      console.log(`Analysis completed for upload ${uploadId}`);

      res.json({
        analysisId: analysis.id,
        ...analysisResult,
        retailPrice: marketData.retailPrice,
        resellPrice: marketData.resellPrice,
        marketSummary: marketData.marketSummary,
        dataQuality: marketData.dataQuality,
        sources: marketData.sources,
        accuracyReport,
        publicImageUrl: publicUrl,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({
        error: "Analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get user's uploads and analyses
  app.get("/api/my-analyses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analyses = await storage.getAnalysesByUser(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching user analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  // Get analyses by session
  app.get("/api/session-analyses/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const analyses = await storage.getAnalysesBySession(sessionId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching session analyses:", error);
      res.status(500).json({ error: "Failed to fetch session analyses" });
    }
  });

  // Save/unsave analysis
  app.post("/api/analyses/:id/save", isAuthenticated, async (req: any, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const savedAnalysis = await storage.saveAnalysis(userId, analysisId);
      res.json({ saved: true, savedAnalysis });
    } catch (error) {
      console.error("Error saving analysis:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  app.delete("/api/analyses/:id/save", isAuthenticated, async (req: any, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const unsaved = await storage.unsaveAnalysis(userId, analysisId);
      res.json({ saved: false, success: unsaved });
    } catch (error) {
      console.error("Error unsaving analysis:", error);
      res.status(500).json({ error: "Failed to unsave analysis" });
    }
  });

  // Get saved analyses
  app.get("/api/saved-analyses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedAnalyses = await storage.getSavedAnalyses(userId);
      res.json(savedAnalyses);
    } catch (error) {
      console.error("Error fetching saved analyses:", error);
      res.status(500).json({ error: "Failed to fetch saved analyses" });
    }
  });

  // Submit feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // WebSocket server setup
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // Setup live API
  setupLiveAPI(wss);

  return httpServer;
}