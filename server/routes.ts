import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUploadSchema, insertAnalysisSchema, insertFeedbackSchema, loginSchema, registerSchema } from "@shared/schema";
import { hashPassword, verifyPassword, requireAuth, requireAdmin, optionalAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_API_KEY || 
  process.env.GOOGLE_GEMINI_API_KEY || 
  ""
);

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
      
      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.json({ user });
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
      
      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const SYSTEM_PROMPT_PRODUCT_ANALYSIS = `You are an expert product analyst. Analyze the provided image to identify the specific product.
Your goal is to return a single object with the following structure and content:
{
  "productName": "string (Full product name, including brand and model, e.g., 'Sony WH-1000XM4 Wireless Noise-Cancelling Headphones')",
  "description": "string (A detailed description of the item, its key features, and common uses. Be thorough.)",
  "averageSalePrice": "string (Estimated average current market sale price for this product when new or in like-new condition. Provide a range if appropriate, e.g., '$250 - $300 USD'. If unknown, state 'Unknown'.)",
  "resellPrice": "string (Estimated average resell price for this product in good used condition. Provide a range if appropriate, e.g., '$150 - $200 USD'. If unknown, state 'Unknown'.)"
}
Focus on the primary product in the image. If multiple distinct products are clearly identifiable as primary, you may focus on the most prominent one.
Utilize web search capabilities if available to gather accurate information for pricing and product details.`;

      const result = await model.generateContent([
        {
          text: SYSTEM_PROMPT_PRODUCT_ANALYSIS
        },
        {
          inlineData: {
            mimeType: upload.mimeType,
            data: base64Image,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

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
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", text);
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      // Validate and create analysis
      const analysisInput = {
        uploadId,
        productName: analysisData.productName || "Unknown Product",
        description: analysisData.description || "No description available",
        averageSalePrice: analysisData.averageSalePrice || "Price not available",
        resellPrice: analysisData.resellPrice || "Resell price not available",
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

  // Get session analyses
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

  // Get session stats
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
  return httpServer;
}
