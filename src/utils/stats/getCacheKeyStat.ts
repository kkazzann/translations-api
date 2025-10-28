import cache from '../../services/cache';
import { cacheHits, cacheMisses } from '../metrics';
import { getCacheSize } from './getCacheSize';
import { getHitRatio } from './math/getHitRatio';

export async function getCacheKeyStat(key: string, timestamp: number): Promise<CacheKeyStat> {
  try {
    const data = await cache.get(key as any);

    const size = getCacheSize(data);
    
    const ageMs = Date.now() - timestamp;
    
    const hits = cacheHits.get(key);
    const misses = cacheMisses.get(key);

    return {
      key,
      lastRefresh: timestamp,
      ageMs,
      size,
      hits,
      misses,
      hitRatio: hits && misses ? getHitRatio(hits, misses) : undefined,
    };
  } catch (err) {
    return {
      key,
      lastRefresh: timestamp,
      ageMs: Date.now() - timestamp,
      size: -1,
      hits: 0,
      misses: 0,
      hitRatio: 0,
      error: String(err),
    };
  }
}
