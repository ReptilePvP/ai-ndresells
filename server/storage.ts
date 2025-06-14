import {
  users,
  uploads,
  analyses,
  feedback,
  savedAnalyses,
  type User,
  type UpsertUser,
  type Upload,
  type InsertUpload,
  type Analysis,
  type InsertAnalysis,
  type AnalysisWithUpload,
  type Feedback,
  type InsertFeedback,
  type SavedAnalysis,
  type InsertSavedAnalysis,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { inArray, lt } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User | undefined>;

  // Upload operations
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUpload(id: number): Promise<Upload | undefined>;
  getUploadsBySession(sessionId: string): Promise<Upload[]>;
  getUploadsByUser(userId: string): Promise<Upload[]>;

  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysesBySession(sessionId: string): Promise<AnalysisWithUpload[]>;
  getAnalysesByUser(userId: string): Promise<AnalysisWithUpload[]>;
  getAnalysisWithUpload(analysisId: number): Promise<AnalysisWithUpload | undefined>;

  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByAnalysis(analysisId: number): Promise<Feedback | undefined>;

  // Saved analysis operations
  saveAnalysis(userId: string, analysisId: number): Promise<SavedAnalysis>;
  unsaveAnalysis(userId: string, analysisId: number): Promise<boolean>;
  getSavedAnalyses(userId: string): Promise<AnalysisWithUpload[]>;
  isAnalysisSaved(userId: string, analysisId: number): Promise<boolean>;

  // History management
  clearUserHistory(userId: string, timeframe: string): Promise<number>;

  // Admin analytics
  getAnalyticsData(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Upload operations
  async createUpload(upload: InsertUpload): Promise<Upload> {
    const [result] = await db.insert(uploads).values(upload).returning();
    return result;
  }

  async getUpload(id: number): Promise<Upload | undefined> {
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    return upload;
  }

  async getUploadsBySession(sessionId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.sessionId, sessionId))
      .orderBy(desc(uploads.uploadedAt));
  }

  async getUploadsByUser(userId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.userId, userId))
      .orderBy(desc(uploads.uploadedAt));
  }

  // Analysis operations
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [result] = await db.insert(analyses).values(analysis).returning();
    return result;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async getAnalysesBySession(sessionId: string): Promise<AnalysisWithUpload[]> {
    const results = await db
      .select()
      .from(analyses)
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .where(eq(uploads.sessionId, sessionId))
      .orderBy(desc(analyses.analyzedAt));

    return results.map((row) => ({
      ...row.analyses,
      upload: row.uploads,
    }));
  }

  async getAnalysesByUser(userId: string): Promise<AnalysisWithUpload[]> {
    const results = await db
      .select()
      .from(analyses)
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .where(eq(uploads.userId, userId))
      .orderBy(desc(analyses.analyzedAt));

    return results.map((row) => ({
      ...row.analyses,
      upload: row.uploads,
    }));
  }

  async getAnalysisWithUpload(analysisId: number): Promise<AnalysisWithUpload | undefined> {
    const [result] = await db
      .select()
      .from(analyses)
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .where(eq(analyses.id, analysisId));

    if (!result) return undefined;

    return {
      ...result.analyses,
      upload: result.uploads,
    };
  }

  // Feedback operations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(feedbackData).returning();
    return result;
  }

  async getFeedbackByAnalysis(analysisId: number): Promise<Feedback | undefined> {
    const [result] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.analysisId, analysisId));
    return result;
  }

  // Saved analysis operations
  async saveAnalysis(userId: string, analysisId: number): Promise<SavedAnalysis> {
    const [result] = await db
      .insert(savedAnalyses)
      .values({ userId, analysisId })
      .returning();
    return result;
  }

  async unsaveAnalysis(userId: string, analysisId: number): Promise<boolean> {
    const result = await db
      .delete(savedAnalyses)
      .where(
        and(
          eq(savedAnalyses.userId, userId),
          eq(savedAnalyses.analysisId, analysisId)
        )
      );
    return (result.rowCount || 0) > 0;
  }

  async getSavedAnalyses(userId: string): Promise<AnalysisWithUpload[]> {
    const results = await db
      .select()
      .from(savedAnalyses)
      .innerJoin(analyses, eq(savedAnalyses.analysisId, analyses.id))
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .where(eq(savedAnalyses.userId, userId))
      .orderBy(desc(savedAnalyses.savedAt));

    return results.map((row) => ({
      ...row.analyses,
      upload: row.uploads,
      isSaved: true,
    }));
  }

  async isAnalysisSaved(userId: string, analysisId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(savedAnalyses)
      .where(
        and(
          eq(savedAnalyses.userId, userId),
          eq(savedAnalyses.analysisId, analysisId)
        )
      );
    return !!result;
  }

  // Clear user history with timeframe options
  async clearUserHistory(userId: string, timeframe: string): Promise<number> {
    let cutoffDate: Date;
    const now = new Date();
    
    switch (timeframe) {
      case '1day':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        // Delete all user's analyses
        const userUploads = await db
          .select({ id: uploads.id })
          .from(uploads)
          .where(eq(uploads.userId, userId));
        
        const uploadIds = userUploads.map(u => u.id);
        
        if (uploadIds.length === 0) {
          return 0;
        }
        
        // Delete analyses for user's uploads
        const deleteResult = await db
          .delete(analyses)
          .where(inArray(analyses.uploadId, uploadIds));
        
        return deleteResult.rowCount || 0;
      default:
        throw new Error('Invalid timeframe specified');
    }
    
    // For time-based clearing, delete analyses older than cutoff date
    const userUploads = await db
      .select({ id: uploads.id })
      .from(uploads)
      .where(and(
        eq(uploads.userId, userId),
        lt(uploads.uploadedAt, cutoffDate)
      ));
    
    const uploadIds = userUploads.map(u => u.id);
    
    if (uploadIds.length === 0) {
      return 0;
    }
    
    const deleteResult = await db
      .delete(analyses)
      .where(inArray(analyses.uploadId, uploadIds));
    
    return deleteResult.rowCount || 0;
  }

  // Admin analytics
  async getAnalyticsData(): Promise<any> {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUploads = await db.select({ count: sql<number>`count(*)` }).from(uploads);
    const totalAnalyses = await db.select({ count: sql<number>`count(*)` }).from(analyses);

    return {
      totalUsers: totalUsers[0]?.count || 0,
      totalUploads: totalUploads[0]?.count || 0,
      totalAnalyses: totalAnalyses[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();