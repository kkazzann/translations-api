interface CacheKeyStat {
  key: string;
  lastRefresh: number;
  ageMs: number;
  size: number;
  hits: number | undefined;
  misses: number | undefined;
  hitRatio: number | undefined;
  error?: string;
}
