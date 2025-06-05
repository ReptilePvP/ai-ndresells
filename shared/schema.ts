import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
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
  confidence: real("confidence"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => analyses.id).notNull(),
  isAccurate: boolean("is_accurate").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
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

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type AnalysisWithUpload = Analysis & {
  upload: Upload;
  feedback?: Feedback;
};
