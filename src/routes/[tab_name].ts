import { app } from "..";
import cache, { CacheOptions } from "../services/cacheService";

app.get("/:tab_name", async (req) => {
  const { tab_name } = req.params as { tab_name: string };
  const key = `dynamic:tab:${tab_name}`;
  const opts: CacheOptions = {
    ttl: 30 * 60 * 1000,
    refreshInterval: 60 * 1000,
    persist: true,
  };
  const loader = async () => {
    return { content: `Content for tab: ${tab_name}` };
  };

  const data = await cache.getOrLoad(key, loader as any, opts as any);
  return data;
});
