import { Elysia } from "elysia";

import { templatesRoutes } from "./static/templates";
import { headerRoutes } from "./static/header";
import { footerRoutes } from "./static/footer";
import { categoryTitlesRoutes } from "./static/category_titles";
import { categoryLinksRoutes } from "./static/category_links";
import cacheService from "../services/cacheService";
import { fetchTranslations } from "../utils/api";
import { cacheRoutes } from "./cache";

export function initializeRoutes(app: Elysia) {
  templatesRoutes(app);

  headerRoutes(app);
  footerRoutes(app);
  categoryTitlesRoutes(app);
  categoryLinksRoutes(app);

  cacheRoutes(app);

  async function prewarmStaticCaches() {
    const options = {
      ttl: 0,
      refreshInterval: 5 * 60 * 1000,
      persist: true,
    } as any;
    const jobs = [
      { key: "static:templates:index", sheet: "TEMPLATES" },
      { key: "static:header:index", sheet: "HEADER" },
      { key: "static:footer:index", sheet: "FOOTER" },
      { key: "static:category_links:index", sheet: "CATEGORY_LINKS" },
      { key: "static:category_titles:index", sheet: "CATEGORY_TITLES" },
    ];

    for (const job of jobs) {
      try {
        const value = await cacheService.getOrLoad(
          job.key,
          async () => await fetchTranslations(job.sheet),
          options,
        );

        const count =
          value && typeof value === "object" ? Object.keys(value).length : 0;

        const progress = await cacheService.getProgress();
        const entry = progress.entries.find(
          (progressEntry: any) => progressEntry.key === job.key,
        ) || {
          hits: 0,
          misses: 0,
        };

        const hits = entry.hits ?? 0;
        const misses = entry.misses ?? 0;
        const hitRate =
          hits + misses > 0 ? (hits / (hits + misses)) * 100 : 100;

        const time = new Date().toLocaleTimeString("pl");

        console.log(
          `🎯 | cache refresh ${time} - ${count} translations | API: sheets/${
            job.sheet
          } | Hit rate: ${hitRate.toFixed(1)}%`,
        );
      } catch (e: any) {
        const time = new Date().toLocaleTimeString("pl");
        console.log(
          `🎯 | cache refresh ${time} - 0 translations | API: sheets/${job.sheet} | Hit rate: 0.0% <---- prewarm failed`,
        );
      }
    }
  }

  prewarmStaticCaches().catch((e) => console.error("Prewarm error:", e));

  return app;
}
