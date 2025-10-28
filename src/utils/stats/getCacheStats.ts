import {
  cacheRefreshTimes,
  cacheHitResponseTimes,
  cacheMissResponseTimes,
  requestTimestamps,
  keyRequestCounts,
  languageRequestCounts,
} from '../metrics';
import { getAverage } from './math/getAverage';
import { getHitRatio } from './math/getHitRatio';
import { getCacheKeyStat } from './getCacheKeyStat';
import { getTopEntries } from './getTopEntries';

export async function getCacheStats(): Promise<CacheStats> {
  // Gather stats for all cache keys
  const keyStats = await Promise.all(
    Array.from(cacheRefreshTimes.entries()).map(([key, ts]) => getCacheKeyStat(key, ts))
  );

  // Calculate summary metrics
  const sheetTabs = keyStats.length;
  const items = keyStats.reduce((sum, stat) => sum + (stat.size > 0 ? stat.size : 0), 0);

  const totalAgeMilis = keyStats.reduce((sum, stat) => sum + stat.ageMs, 0);

  const totalHits = keyStats.reduce((sum, stat) => sum + (stat.hits || 0), 0) || undefined;
  const totalMisses = keyStats.reduce((sum, stat) => sum + (stat.misses || 0), 0) || undefined;

  // Calculate performance metrics
  const avgCacheHitResponseTime = getAverage(cacheHitResponseTimes);
  const avgCacheMissResponseTime = getAverage(cacheMissResponseTimes);
  const avgOverallResponseTime = getAverage([...cacheHitResponseTimes, ...cacheMissResponseTimes]);

  return {
    code: 200,
    message: 'Cache statistics retrieved successfully.',
    summary: {
      sheetTabs,
      totalSize: items,
      avgAgeMs: sheetTabs > 0 ? Math.round(totalAgeMilis / sheetTabs) : 0,
      totalHits,
      totalMisses,
      overallHitRatio: totalHits && totalMisses ? getHitRatio(totalHits, totalMisses) : undefined,
    },
    performance: {
      avgCacheHitResponseTime,
      avgCacheMissResponseTime,
      avgOverallResponseTime,
      requestsPerMinute: requestTimestamps.length || undefined,
    },
    topKeys: getTopEntries(keyRequestCounts, 10, (key, count) => ({ key, count })),
    topLanguages: getTopEntries(languageRequestCounts, 10, (language, count) => ({
      language,
      count,
    })),
    keys: keyStats.sort((a, b) => b.size - a.size), // Sort by size descending
  };
}
