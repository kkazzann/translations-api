interface CacheStats {
  code: number;
  message: string;
  summary: {
    sheetTabs: number;
    totalSize: number;
    avgAgeMs: number;
    totalHits?: number;
    totalMisses?: number;
    overallHitRatio?: number;
  };
  performance: {
    avgCacheHitResponseTime?: number;
    avgCacheMissResponseTime?: number;
    avgOverallResponseTime?: number;
    requestsPerMinute?: number;
  };
  topKeys?: Array<{ key: string; count: number }>;
  topLanguages?: Array<{ language: string; count: number }>;
  keys: CacheKeyStat[];
}
