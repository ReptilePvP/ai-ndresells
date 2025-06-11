
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
}

export interface ProductData {
  productName: string;
  brand?: string;
  model?: string;
  category?: string;
  condition?: string;
  averageSalePrice: string;
  resellPrice: string;
  marketDemand?: string;
}

export interface AccuracyReport {
  overallConfidence: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  summary: string;
  improvements: string[];
}

export interface CachedAnalysis {
  analysisData: any;
  timestamp: number;
  confidence: number;
}
