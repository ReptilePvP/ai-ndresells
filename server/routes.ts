import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertUploadSchema, insertAnalysisSchema, insertFeedbackSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
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
  app.get("/api/admin/analytics", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalyticsData();
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.put("/api/admin/users/:userId/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Valid role (user or admin) is required" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser, message: `User role updated to ${role}` });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Promote user to admin by email (special endpoint for initial setup)
  app.post("/api/admin/promote-by-email", async (req, res) => {
    try {
      const { email, adminSecret } = req.body;
      
      // Simple protection - you can change this secret
      if (adminSecret !== "make-me-admin-2025") {
        return res.status(403).json({ message: "Invalid admin secret" });
      }

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found with that email" });
      }

      const updatedUser = await storage.updateUserRole(user.id, 'admin');
      res.json({ 
        user: updatedUser, 
        message: `User ${email} promoted to admin successfully` 
      });
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      res.status(500).json({ message: "Failed to promote user to admin" });
    }
  });

  // Upload image endpoint
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const customSessionId = req.body.sessionId;
      const sessionId = customSessionId || req.sessionID || `session_${Date.now()}`;
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
        id: analysis.id,
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

  // Get analyses (unified endpoint for both authenticated and guest users)
  app.get("/api/analyses", async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { sessionId } = req.query;

      if (userId) {
        // Authenticated user - get their analyses
        const analyses = await storage.getAnalysesByUser(userId);
        res.json(analyses);
      } else if (sessionId) {
        // Guest user - get session-based analyses
        const analyses = await storage.getAnalysesBySession(sessionId as string);
        res.json(analyses);
      } else {
        res.status(400).json({ error: "Session ID required for guest users" });
      }
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
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

  // Clear user history with time-based options
  app.delete("/api/history/clear", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { timeframe } = req.body;

      if (!timeframe) {
        return res.status(400).json({ error: "Timeframe is required" });
      }

      const deletedCount = await storage.clearUserHistory(userId, timeframe);

      res.json({ 
        message: "History cleared successfully",
        deletedCount 
      });
    } catch (error) {
      console.error("Clear history error:", error);
      res.status(500).json({ error: "Failed to clear history" });
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

        imagePath = path.join(process.cwd(), upload.filePath);
      } else {
        // It's a filename - handle both regular uploads and reference images
        if (identifier.startsWith('ref_') || identifier.startsWith('ebay_')) {
          // Reference image
          imagePath = path.join(process.cwd(), "uploads", identifier);
        } else {
          // Regular upload
          imagePath = path.join(process.cwd(), "uploads", identifier);
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
      res.sendFile(path.resolve(imagePath));
    } catch (error) {
      console.error('Image serve error:', error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // WebSocket server setup with path separation
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/live-api'
  });

  // Setup live API
  setupLiveAPI(wss);

  return httpServer;
}