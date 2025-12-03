export interface CacheStatsResponse {
  avgResponseTime?: number; // in milliseconds
  rpmHistory?: number[]; // requests per minute, data from every 1 hour
  top10Queries?: { name: string; count: number }[]; // top 10 queries with their request counts
  sheetTabs: { name: string }[]; // list of sheet tab names
  items: number;
  topLanguages?: { name: string; count: number }[];
  memoryUsed?: number;
  hits?: number;
  misses?: number;
  recentQueries?: { name: string; time: number }[]; // time in milliseconds
  queriesLast30Days?: number;
}
