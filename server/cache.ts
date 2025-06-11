import NodeCache from 'node-cache';
import crypto from 'crypto';

// Create cache instance with 1 hour TTL
const analysisCache = new NodeCache({
  stdTTL: 3600, // Cache for 1 hour
  checkperiod: 600 // Check for expired entries every 10 minutes
});

export interface CachedAnalysis {
  analysisData: any;
  timestamp: number;
  confidence: number;
}

export function generateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('md5').update(imageBuffer).digest('hex');
}

export function getCachedAnalysis(imageHash: string): CachedAnalysis | undefined {
  return analysisCache.get(imageHash);
}

export function setCachedAnalysis(imageHash: string, analysis: CachedAnalysis): void {
  analysisCache.set(imageHash, analysis);
}

export function clearCache(): void {
  analysisCache.flushAll();
}

// Optional: Add cache statistics
export function getCacheStats() {
  return analysisCache.getStats();
}