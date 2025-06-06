import { 
  uploads, analyses, feedback, users,
  type Upload, type Analysis, type Feedback, type User, type UserWithoutPassword, type AnalysisWithUpload,
  type InsertUpload, type InsertAnalysis, type InsertFeedback, type InsertUser, type RegisterData
} from "@shared/schema";
import { db } from "./db";
import { eq, count, avg, sum, desc, gte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: RegisterData & { password: string }): Promise<UserWithoutPassword>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<UserWithoutPassword | undefined>;
  getAllUsers(): Promise<UserWithoutPassword[]>;

  // Upload operations
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUpload(id: number): Promise<Upload | undefined>;
  getUploadsBySession(sessionId: string): Promise<Upload[]>;
  getUploadsByUser(userId: number): Promise<Upload[]>;

  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysesBySession(sessionId: string): Promise<AnalysisWithUpload[]>;
  getAnalysesByUser(userId: number): Promise<AnalysisWithUpload[]>;
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

  // Admin diagnostics
  getSystemStats(): Promise<{
    totalUsers: number;
    totalAnalyses: number;
    totalUploads: number;
    averageAccuracy: number;
    recentActivity: {
      last24Hours: number;
      last7Days: number;
    };
  }>;
  getAllUploadsWithAnalyses(): Promise<(Upload & { analyses: AnalysisWithUpload[]; user?: UserWithoutPassword })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: RegisterData & { password: string }): Promise<UserWithoutPassword> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        role: 'user',
        isActive: true,
      })
      .returning();
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<UserWithoutPassword | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) return undefined;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getAllUsers(): Promise<UserWithoutPassword[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // Upload operations
  async getUpload(id: number): Promise<Upload | undefined> {
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    return upload || undefined;
  }

  async getUploadsBySession(sessionId: string): Promise<Upload[]> {
    return await db.select().from(uploads).where(eq(uploads.sessionId, sessionId));
  }

  async getUploadsByUser(userId: number): Promise<Upload[]> {
    return await db.select().from(uploads).where(eq(uploads.userId, userId));
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
      .orderBy(desc(analyses.analyzedAt));

    return result.map(row => ({
      ...row.analysis,
      upload: row.upload,
      feedback: row.feedback || undefined,
    }));
  }

  async getAnalysesByUser(userId: number): Promise<AnalysisWithUpload[]> {
    const result = await db
      .select({
        analysis: analyses,
        upload: uploads,
        feedback: feedback,
      })
      .from(analyses)
      .innerJoin(uploads, eq(analyses.uploadId, uploads.id))
      .leftJoin(feedback, eq(feedback.analysisId, analyses.id))
      .where(eq(uploads.userId, userId))
      .orderBy(desc(analyses.analyzedAt));

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

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalAnalyses: number;
    totalUploads: number;
    averageAccuracy: number;
    recentActivity: {
      last24Hours: number;
      last7Days: number;
    };
  }> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total counts
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [totalAnalysesResult] = await db.select({ count: count() }).from(analyses);
    const [totalUploadsResult] = await db.select({ count: count() }).from(uploads);

    // Get recent activity
    const [last24HoursResult] = await db
      .select({ count: count() })
      .from(analyses)
      .where(gte(analyses.analyzedAt, last24Hours));

    const [last7DaysResult] = await db
      .select({ count: count() })
      .from(analyses)
      .where(gte(analyses.analyzedAt, last7Days));

    // Calculate average accuracy
    const allFeedback = await db.select().from(feedback);
    const accurateCount = allFeedback.filter(f => f.isAccurate).length;
    const averageAccuracy = allFeedback.length > 0 ? (accurateCount / allFeedback.length) * 100 : 0;

    return {
      totalUsers: totalUsersResult.count,
      totalAnalyses: totalAnalysesResult.count,
      totalUploads: totalUploadsResult.count,
      averageAccuracy: Math.round(averageAccuracy),
      recentActivity: {
        last24Hours: last24HoursResult.count,
        last7Days: last7DaysResult.count,
      },
    };
  }

  async getAllUploadsWithAnalyses(): Promise<(Upload & { analyses: AnalysisWithUpload[]; user?: UserWithoutPassword })[]> {
    // Get all uploads with their associated analyses
    const uploadsWithAnalyses = await db
      .select({
        upload: uploads,
        analysis: analyses,
        feedback: feedback,
        user: users,
      })
      .from(uploads)
      .leftJoin(analyses, eq(uploads.id, analyses.uploadId))
      .leftJoin(feedback, eq(analyses.id, feedback.analysisId))
      .leftJoin(users, eq(uploads.userId, users.id))
      .orderBy(desc(uploads.uploadedAt));

    // Group by upload ID and aggregate analyses
    const uploadMap = new Map<number, Upload & { analyses: AnalysisWithUpload[]; user?: UserWithoutPassword }>();

    for (const row of uploadsWithAnalyses) {
      const uploadId = row.upload.id;
      
      if (!uploadMap.has(uploadId)) {
        let userWithoutPassword: UserWithoutPassword | undefined = undefined;
        if (row.user) {
          const { password, ...userWithoutPass } = row.user;
          userWithoutPassword = userWithoutPass;
        }
        uploadMap.set(uploadId, {
          ...row.upload,
          analyses: [],
          user: userWithoutPassword,
        });
      }

      const uploadData = uploadMap.get(uploadId)!;
      
      if (row.analysis) {
        const analysisWithUpload: AnalysisWithUpload = {
          ...row.analysis,
          upload: row.upload,
          feedback: row.feedback || undefined,
        };
        uploadData.analyses.push(analysisWithUpload);
      }
    }

    return Array.from(uploadMap.values());
  }
}

export const storage = new DatabaseStorage();
