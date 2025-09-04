import { Elysia } from "elysia";
import { isLocale } from "../../utils";
import { withResponse } from "../../utils/response";
import { Endpoint } from "../../utils/endpoint";
import { fetchTranslations } from "../../utils/api";

import { performance } from "perf_hooks";
import cache, { CacheOptions } from "../../services/cacheService";

class CategoryTitlesIndex extends Endpoint<any> {
  constructor() {
    super("/category_titles", "get");
  }

  protected async loader() {
    const key = "static:category_titles:index";
    const opts: CacheOptions = {
      ttl: 0,
      refreshInterval: 5 * 60 * 1000,
      persist: true,
    };
    return await cache.getOrLoad(
      key,
      async () => await fetchTranslations("CATEGORY_TITLES"),
      opts as any,
    );
  }

  protected resolveSuccess(_request: any, data: any, start: number) {
    return {
      status: 200,
      message: "All category titles for all languages",
      templates: data,
      execTime: `${(performance.now() - start).toFixed(2)}ms`,
    };
  }
}

class CategoryTitlesNameOrLang extends Endpoint<any> {
  constructor() {
    super("/category_titles/:nameOrLanguage", "get");
  }

  protected async loader({ params }: any) {
    const { nameOrLanguage } = params as { nameOrLanguage: string };
    const indexKey = "static:category_titles:index";
    const opts: CacheOptions = {
      ttl: 0,
      refreshInterval: 5 * 60 * 1000,
      persist: true,
    };
    const full = await cache.getOrLoad(
      indexKey,
      async () => await fetchTranslations("CATEGORY_TITLES"),
      opts as any,
    );
    if (isLocale(nameOrLanguage)) {
      const locale = nameOrLanguage.toLowerCase();
      const out: Record<string, any> = {};
      for (const k of Object.keys(full || {})) {
        const v = full[k]?.[locale];
        if (v !== undefined) out[k] = v;
      }
      const wrapped: Record<string, any> = {};
      Object.keys(out).forEach((k) => (wrapped[k] = { [locale]: out[k] }));
      return wrapped;
    }
    return full?.[nameOrLanguage] ?? {};
  }

  protected resolveSuccess(request: any, data: any, start: number) {
    const { nameOrLanguage } = request.params;
    const message = isLocale(nameOrLanguage)
      ? `All category titles for ${nameOrLanguage.toUpperCase()} language`
      : `${nameOrLanguage} for all languages`;

    return {
      status: 200,
      message,
      templates: data,
      execTime: `${(performance.now() - start).toFixed(2)}ms`,
    };
  }
}

class CategoryTitlesLanguage extends Endpoint<any> {
  constructor() {
    super("/category_titles/:nameOrLanguage/:language", "get");
  }

  protected async loader({ params }: any) {
    const { nameOrLanguage: name, language } = params as {
      nameOrLanguage: string;
      language: string;
    };
    if (!isLocale(language)) throw new Error(`Invalid language: ${language}`);
    const normalized = language.toLowerCase();
    const indexKey = "static:category_titles:index";
    const opts: CacheOptions = {
      ttl: 0,
      refreshInterval: 5 * 60 * 1000,
      persist: true,
    };
    const full = await cache.getOrLoad(
      indexKey,
      async () => await fetchTranslations("CATEGORY_TITLES"),
      opts as any,
    );
    const val = full?.[name]?.[normalized];
    if (val === undefined) return null;
    return { [name]: { [normalized]: val } };
  }

  protected resolveSuccess(request: any, data: any, start: number) {
    const { nameOrLanguage: name, language } = request.params;
    const message = `${name} template for ${language.toUpperCase()} language`;
    return {
      status: 200,
      message,
      templates: data,
      execTime: `${(performance.now() - start).toFixed(2)}ms`,
    };
  }
}

export function categoryTitlesRoutes(app: Elysia) {
  withResponse(app);
  new CategoryTitlesIndex().register(app);
  new CategoryTitlesNameOrLang().register(app);
  new CategoryTitlesLanguage().register(app);
  return app;
}
