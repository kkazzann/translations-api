import cache from '../../services/cache';
import {
  cacheRefreshTimes,
  cacheHits,
  cacheMisses,
  cacheHitResponseTimes,
  cacheMissResponseTimes,
  keyRequestCounts,
  languageRequestCounts,
  requestHistory,
} from '../metrics';
import {
  getTopQueriesLast30Days,
  getRpmHistoryMinutes,
  getRecentQueries,
  getQueriesCountLast30Days,
} from '../db';
import { getCacheSize } from './getCacheSize';

export interface CacheStatsResponse {
  avgResponseTime?: number; // in milliseconds
  rpmHistory?: number[]; // requests per minute, data from every 1 hour (60 entries)
  top10Queries?: { name: string; count: number }[]; // top 10 queries with their request counts
  sheetTabs: { name: string }[]; // list of sheet tab names
  items: number;
  topLanguages?: { name: string; count: number }[];
  memoryUsed?: number;
  hits?: number;
  misses?: number;
  recentQueries?: { name?: string; time: number }[]; // time in ms
  queriesLast30Days?: number;
}

function average(numbers: number[]): number | undefined {
  if (!numbers || numbers.length === 0) return undefined;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export async function getCacheStats(): Promise<CacheStatsResponse> {
  const now = Date.now();

  // sheet tabs list from cacheRefreshTimes keys
  const sheetTabs = Array.from(cacheRefreshTimes.keys()).map((k) => ({ name: k }));

  // total items = sum of sizes of cached entries
  let items = 0;
  for (const key of cacheRefreshTimes.keys()) {
    try {
      const data = await cache.get(key as any);
      items += getCacheSize(data);
    } catch (err) {
      // ignore errors per-key
    }
  }

  // avg response time across hits and misses
  const combined = [...cacheHitResponseTimes, ...cacheMissResponseTimes];
  const avgResponseTime = average(combined);

  // rpmHistory: requests-per-minute for the last hour (60 entries). Prefer persisted DB, fallback to in-memory.
  const minutes = 60;
  let rpmHistory: number[] = [];
  try {
    rpmHistory = getRpmHistoryMinutes(minutes);
  } catch (err) {
    rpmHistory = [];
  }
  if (!rpmHistory || rpmHistory.length === 0) {
    const oneMin = 60 * 1000;
    rpmHistory = new Array(minutes).fill(0);
    const cutoff = now - minutes * oneMin;
    for (const entry of requestHistory) {
      if (entry.time < cutoff) continue;
      const minuteIndex = Math.floor((entry.time - cutoff) / oneMin);
      if (minuteIndex >= 0 && minuteIndex < minutes) rpmHistory[minuteIndex]++;
    }
  }

  // top10 queries
  // top10 queries - prefer DB if available
  let top10Queries = [] as { name: string; count: number }[];
  try {
    top10Queries = getTopQueriesLast30Days(10);
  } catch (err) {
    top10Queries = [];
  }
  if (!top10Queries || top10Queries.length === 0) {
    top10Queries = Array.from(keyRequestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }

  // top languages
  const topLanguages = Array.from(languageRequestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // memory used (rss) in bytes
  const memoryUsed =
    typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage().rss : undefined;

  // hits & misses totals
  const hits = Array.from(cacheHits.values()).reduce((a, b) => a + b, 0) || undefined;
  const misses = Array.from(cacheMisses.values()).reduce((a, b) => a + b, 0) || undefined;

  // recentQueries - prefer DB persisted list
  let recentQueries = [] as { name?: string; time: number }[];
  try {
    recentQueries = getRecentQueries(50);
  } catch (err) {
    recentQueries = [];
  }
  if (!recentQueries || recentQueries.length === 0) {
    recentQueries = requestHistory.slice(-50).map((r) => ({ name: r.name, time: r.time }));
  }

  // queries in last 30 days
  let queriesLast30Days = 0;
  try {
    queriesLast30Days = getQueriesCountLast30Days();
  } catch (err) {
    queriesLast30Days = 0;
  }
  if (!queriesLast30Days) {
    const day30 = 30 * 24 * 60 * 60 * 1000;
    queriesLast30Days = requestHistory.filter((r) => r.time >= now - day30).length;
  }

  return {
    avgResponseTime,
    rpmHistory,
    top10Queries: top10Queries.length ? top10Queries : undefined,
    sheetTabs,
    items,
    topLanguages: topLanguages.length ? topLanguages : undefined,
    memoryUsed,
    hits,
    misses,
    recentQueries,
    queriesLast30Days,
  };
}
