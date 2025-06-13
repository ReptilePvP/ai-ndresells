import { pgTable, text, serial, integer, boolean, timestamp, real, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User accounts with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("user"), // 'user' or 'admin'
  isActive: boolean("is_active").notNull().default(true),
  apiProvider: text("api_provider", { enum: ["gemini", "searchapi", "serpapi"] }).default("gemini").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  publicUrl: text("public_url"),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").references(() => uploads.id).notNull(),
  productName: text("product_name").notNull(),
  description: text("description").notNull(),
  averageSalePrice: text("average_sale_price").notNull(),
  resellPrice: text("resell_price").notNull(),
  referenceImageUrl: text("reference_image_url"),
  marketSummary: text("market_summary"),
  confidence: real("confidence"),
  thoughtProcess: text("thought_process"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => analyses.id).notNull(),
  isAccurate: boolean("is_accurate").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const savedAnalyses = pgTable("saved_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  analysisId: integer("analysis_id").references(() => analyses.id).notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

// Schema validation for user registration and authentication
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  analyzedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  submittedAt: true,
});

export const insertSavedAnalysisSchema = createInsertSchema(savedAnalyses).omit({
  id: true,
  savedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type InsertSavedAnalysis = z.infer<typeof insertSavedAnalysisSchema>;
export type SavedAnalysis = typeof savedAnalyses.$inferSelect;

export type AnalysisWithUpload = Analysis & {
  upload: Upload;
  feedback?: Feedback;
  isSaved?: boolean;
};

export type UserWithoutPassword = Omit<User, 'password'>;
