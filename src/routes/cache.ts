import { Elysia } from "elysia";
import cacheService from "../services/cacheService";

export function cacheRoutes(app: Elysia) {
  app.group("cache", (cache) => {
    cache.get("/status", async () => {
      return await cacheService.status();
    });

    cache.get("/progress", async () => {
      return await cacheService.getProgress();
    });

    cache.get("/changelog/:key", async ({ params }) => {
      const { key } = params as { key: string };
      return { key, changelog: await cacheService.getChangelog(key) };
    });

    cache.post("/refresh/:key", async ({ params, body }) => {
      const { key } = params as { key: string };

      const disk = await cacheService.get(key);
      if (disk !== null) {
        await cacheService.set(key, disk as any, { persist: true });
        return { ok: true, method: "disk" };
      }
      return {
        ok: false,
        reason: "no loader available; provide loader or warm the key first",
      };
    });

    cache.delete("/:key", async ({ params }) => {
      const { key } = params as { key: string };
      return await cacheService.clearKey(key);
    });

    return cache;
  });

  return app;
}
