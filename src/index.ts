import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { cron } from "@elysiajs/cron";
import { initializeRoutes } from "./routes";
import cacheService from "./services/cacheService";

export const app = new Elysia({
  prefix: "/api/v1",
  normalize: true,
});

app.use(
  swagger({
    path: "/docs",
    documentation: {
      info: {
        title: "Beliani Translations API",
        version: "1.0.0",
      },
    },
  })
);

function formatTime(date: Date) {
  return date.toLocaleTimeString("pl");
}

type CacheStats = {
  totalTranslations: number;
  hits: number;
  misses: number;
  hitRate: number;
  apiLabel: string;
};

async function computeCacheStats(): Promise<CacheStats> {
  const progress = await cacheService.getProgress();
  const entries = progress.entries ?? [];

  let total = 0;
  for (const e of entries) {
    try {
      const v = await cacheService.get(e.key);
      if (v && typeof v === "object") total += Object.keys(v).length;
    } catch (_err) {}
  }

  const hits = entries.reduce((s: number, x: any) => s + (x.hits ?? 0), 0);
  const misses = entries.reduce((s: number, x: any) => s + (x.misses ?? 0), 0);
  const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 100;

  const apiLabel = entries.find((x: any) => x.key.includes("templates"))
    ? "sheets/TEMPLATES"
    : entries.length > 0
    ? entries[0].key.replace(/:/g, "/")
    : "-/-";

  return {
    totalTranslations: total,
    hits,
    misses,
    hitRate,
    apiLabel,
  };
}

function formatCacheLog(date: Date, stats: CacheStats) {
  return `🎯 cache refresh ${formatTime(date)} - ${
    stats.totalTranslations
  } translations | API: ${stats.apiLabel} | Hit rate: ${stats.hitRate.toFixed(
    1
  )}%`;
}

app.use(
  cron({
    name: "log-cache-progress",
    // run at 0 seconds every 5 minutes
    pattern: "0 */5 * * * *",
    async run() {
      const now = new Date();
      try {
        const stats = await computeCacheStats();
        console.log(
          formatCacheLog(now, stats).replace(
            "🎯 | cache refresh",
            "📌 | cache stats"
          )
        );
      } catch (e) {
        console.log(
          `📌 | cache stats ${formatTime(
            now
          )} - 0 translations | API: -/- | Hit rate: 100%`
        );
      }
    },
  })
);

initializeRoutes(app);

app.listen(3000);

console.log(
  ` - -`.repeat(30),
  `\n`,
  ` `.repeat(30),
  ` 🔥 API is running at http://${app.server?.hostname}:${app.server?.port}`,
  `\n`,
  `- - `.repeat(30)
);
