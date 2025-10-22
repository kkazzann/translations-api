export type Summary = {
  totalCachedItems: number;
  averageAgeMs: number;
  totalHits: number;
  totalMisses: number;
  overallHitRatio: number;
  topKeysBySize: Array<{ key: string; size: number }>;

  requestsPerMinute: number;
  avgOverallResponseTime: number;
  avgCacheHitResponseTime: number;
  avgCacheMissResponseTime: number;
  topRequestedKeys: Array<{ key: string; count: number }>;
  topRequestedLanguages: Array<{ language: string; count: number }>;
  recentDynamicSheetAccesses: Array<{ sheetTab: string; lastAccess: number }>;
  recentDynamicSheetUpdates: Array<{ sheetTab: string; lastUpdate: number }>;
  cacheMemoryUsageBytes: number;
  cacheMemoryUsageMB: number;
};
