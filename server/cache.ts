import NodeCache from 'node-cache';
import crypto from 'crypto';

// Create cache instance with 1 hour TTL
const analysisCache = new NodeCache({
  stdTTL: 3600, // Cache for 1 hour
  checkperiod: 600 // Check for expired entries every 10 minutes
});

// Track image hashes that have received negative feedback
const negativeFeedbackHashes = new Set<string>();

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

export function clearSpecificCache(imageHash: string): void {
  analysisCache.del(imageHash);
  negativeFeedbackHashes.add(imageHash);
}

export function hasNegativeFeedback(imageHash: string): boolean {
  return negativeFeedbackHashes.has(imageHash);
}

export function clearNegativeFeedback(imageHash: string): void {
  negativeFeedbackHashes.delete(imageHash);
}

// Optional: Add cache statistics
export function getCacheStats() {
  return analysisCache.getStats();
}