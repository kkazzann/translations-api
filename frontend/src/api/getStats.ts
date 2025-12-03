import axios from 'axios';
import type { CacheStatsResponse } from '../types/cachestats-response';

const apiPath = 'http://192.168.160.62:3000/admin/cache-stats';

export async function getStats(): Promise<CacheStatsResponse> {
  return axios.get<CacheStatsResponse>(apiPath).then((response) => response.data);
}
