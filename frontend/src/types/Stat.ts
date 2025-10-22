export type Stat = {
  key: string;
  size: number;
  lastRefresh: number;
  ageMs?: number;
  hits?: number;
  misses?: number;
  hitRatio?: number;
};
