import { uploads, analyses, feedback, type Upload, type Analysis, type Feedback, type InsertUpload, type InsertAnalysis, type InsertFeedback, type AnalysisWithUpload } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Upload operations
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUpload(id: number): Promise<Upload | undefined>;
  getUploadsBySession(sessionId: string): Promise<Upload[]>;

  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysesBySession(sessionId: string): Promise<AnalysisWithUpload[]>;
  getAnalysisWithUpload(analysisId: number): Promise<AnalysisWithUpload | undefined>;

  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByAnalysis(analysisId: number): Promise<Feedback | undefined>;

  // Stats
  getSessionStats(sessionId: string): Promise<{
    totalAnalyses: number;
    accuracyRate: number;
    totalValue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUpload(id: number): Promise<Upload | undefined> {
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    return upload || undefined;
  }

  async getUploadsBySession(sessionId: string): Promise<Upload[]> {
    return await db.select().from(uploads).where(eq(uploads.sessionId, sessionId));
  }

  async createUpload(insertUpload: InsertUpload): Promise<Upload> {
    const [upload] = await db
      .insert(uploads)
      .values(insertUpload)
      .returning();
    return upload;
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async getAnalysesBySession(sessionId: string): Promise<AnalysisWithUpload[]> {
    const result = await db
      .select({
        analysis: analyses,
        upload: uploads,
        feedback: feedback,
      })
      .from(analyses)
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .leftJoin(feedback, eq(feedback.analysisId, analyses.id))
      .where(eq(uploads.sessionId, sessionId))
      .orderBy(analyses.analyzedAt);

    return result.map(row => ({
      ...row.analysis,
      upload: row.upload,
      feedback: row.feedback || undefined,
    }));
  }

  async getAnalysisWithUpload(analysisId: number): Promise<AnalysisWithUpload | undefined> {
    const result = await db
      .select({
        analysis: analyses,
        upload: uploads,
        feedback: feedback,
      })
      .from(analyses)
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .leftJoin(feedback, eq(feedback.analysisId, analyses.id))
      .where(eq(analyses.id, analysisId));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row.analysis,
      upload: row.upload,
      feedback: row.feedback || undefined,
    };
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(insertFeedback)
      .returning();
    return newFeedback;
  }

  async getFeedbackByAnalysis(analysisId: number): Promise<Feedback | undefined> {
    const [existingFeedback] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.analysisId, analysisId));
    return existingFeedback || undefined;
  }

  async getSessionStats(sessionId: string): Promise<{
    totalAnalyses: number;
    accuracyRate: number;
    totalValue: number;
  }> {
    const analysesData = await this.getAnalysesBySession(sessionId);
    const totalAnalyses = analysesData.length;
    
    const feedbackCount = analysesData.filter(a => a.feedback).length;
    const accurateCount = analysesData.filter(a => a.feedback?.isAccurate).length;
    const accuracyRate = feedbackCount > 0 ? (accurateCount / feedbackCount) * 100 : 0;
    
    // Calculate total value from price strings
    const totalValue = analysesData.reduce((sum, analysis) => {
      const priceMatch = analysis.averageSalePrice.match(/\$?([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
      return sum + price;
    }, 0);
    
    return {
      totalAnalyses,
      accuracyRate: Math.round(accuracyRate),
      totalValue,
    };
  }
}

export const storage = new DatabaseStorage();
