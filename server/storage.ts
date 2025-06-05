import { uploads, analyses, feedback, type Upload, type Analysis, type Feedback, type InsertUpload, type InsertAnalysis, type InsertFeedback, type AnalysisWithUpload } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private uploads: Map<number, Upload>;
  private analyses: Map<number, Analysis>;
  private feedbacks: Map<number, Feedback>;
  private uploadIdCounter: number;
  private analysisIdCounter: number;
  private feedbackIdCounter: number;

  constructor() {
    this.uploads = new Map();
    this.analyses = new Map();
    this.feedbacks = new Map();
    this.uploadIdCounter = 1;
    this.analysisIdCounter = 1;
    this.feedbackIdCounter = 1;
  }

  async createUpload(insertUpload: InsertUpload): Promise<Upload> {
    const id = this.uploadIdCounter++;
    const upload: Upload = {
      ...insertUpload,
      id,
      uploadedAt: new Date(),
    };
    this.uploads.set(id, upload);
    return upload;
  }

  async getUpload(id: number): Promise<Upload | undefined> {
    return this.uploads.get(id);
  }

  async getUploadsBySession(sessionId: string): Promise<Upload[]> {
    return Array.from(this.uploads.values()).filter(
      (upload) => upload.sessionId === sessionId
    );
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = this.analysisIdCounter++;
    const analysis: Analysis = {
      ...insertAnalysis,
      id,
      analyzedAt: new Date(),
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getAnalysesBySession(sessionId: string): Promise<AnalysisWithUpload[]> {
    const sessionUploads = await this.getUploadsBySession(sessionId);
    const uploadIds = sessionUploads.map(u => u.id);
    
    const result: AnalysisWithUpload[] = [];
    
    for (const analysis of this.analyses.values()) {
      if (uploadIds.includes(analysis.uploadId)) {
        const upload = this.uploads.get(analysis.uploadId)!;
        const feedback = Array.from(this.feedbacks.values()).find(f => f.analysisId === analysis.id);
        
        result.push({
          ...analysis,
          upload,
          feedback,
        });
      }
    }
    
    return result.sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime());
  }

  async getAnalysisWithUpload(analysisId: number): Promise<AnalysisWithUpload | undefined> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) return undefined;
    
    const upload = this.uploads.get(analysis.uploadId);
    if (!upload) return undefined;
    
    const feedback = Array.from(this.feedbacks.values()).find(f => f.analysisId === analysisId);
    
    return {
      ...analysis,
      upload,
      feedback,
    };
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const id = this.feedbackIdCounter++;
    const feedback: Feedback = {
      ...insertFeedback,
      id,
      submittedAt: new Date(),
    };
    this.feedbacks.set(id, feedback);
    return feedback;
  }

  async getFeedbackByAnalysis(analysisId: number): Promise<Feedback | undefined> {
    return Array.from(this.feedbacks.values()).find(f => f.analysisId === analysisId);
  }

  async getSessionStats(sessionId: string): Promise<{
    totalAnalyses: number;
    accuracyRate: number;
    totalValue: number;
  }> {
    const analyses = await this.getAnalysesBySession(sessionId);
    const totalAnalyses = analyses.length;
    
    const feedbackCount = analyses.filter(a => a.feedback).length;
    const accurateCount = analyses.filter(a => a.feedback?.isAccurate).length;
    const accuracyRate = feedbackCount > 0 ? (accurateCount / feedbackCount) * 100 : 0;
    
    // Calculate total value from price strings
    const totalValue = analyses.reduce((sum, analysis) => {
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

export const storage = new MemStorage();
