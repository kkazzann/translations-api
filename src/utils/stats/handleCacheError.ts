import { Result } from '../../types/cache/Result';
import { formatTime } from '../time';

export function handleCacheError(cacheKey: string, error: any): Result<null> {
  const timestamp = formatTime(new Date());
  console.error(`[${timestamp}] 🚒 | Failed to process cache key '${cacheKey}':`, error);

  return {
    message: `Error processing cache key '${cacheKey}'`,
    error: String(error),
    details: String(error),
  };
}
