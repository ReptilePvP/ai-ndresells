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

export function generateCacheKey(imageHash: string, apiProvider: string): string {
  return `${imageHash}:${apiProvider}`;
}

export function getCachedAnalysis(imageHash: string, apiProvider?: string): CachedAnalysis | undefined {
  const cacheKey = apiProvider ? generateCacheKey(imageHash, apiProvider) : imageHash;
  return analysisCache.get(cacheKey);
}

export function setCachedAnalysis(imageHash: string, analysis: CachedAnalysis, apiProvider?: string): void {
  const cacheKey = apiProvider ? generateCacheKey(imageHash, apiProvider) : imageHash;
  analysisCache.set(cacheKey, analysis);
}

export function clearCache(): void {
  analysisCache.flushAll();
}

export function clearSpecificCache(imageHash: string, apiProvider?: string): void {
  if (apiProvider) {
    // Clear specific API provider cache
    const cacheKey = generateCacheKey(imageHash, apiProvider);
    analysisCache.del(cacheKey);
  } else {
    // Clear all API provider caches for this image
    const allProviders = ['gemini', 'searchapi', 'serpapi'];
    allProviders.forEach(provider => {
      const cacheKey = generateCacheKey(imageHash, provider);
      analysisCache.del(cacheKey);
    });
    // Also clear legacy cache key (without provider)
    analysisCache.del(imageHash);
  }
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