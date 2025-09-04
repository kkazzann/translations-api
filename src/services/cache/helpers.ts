import fs from "fs";
import fsp from "fs/promises";
import path from "path";

export function sanitize(key: string) {
  return key.replace(/[^a-z0-9._-]/gi, "_");
}

export function changelogPath(baseDir: string, key: string) {
  return path.join(baseDir, `${sanitize(key)}.json`);
}

export async function readChangelogFile(baseDir: string, key: string) {
  const fp = changelogPath(baseDir, key);
  try {
    const txt = await fsp.readFile(fp, "utf8");
    const raw = JSON.parse(txt);
    const normalized = normalizeChangelogArray(raw);
    // rewrite normalized form when possible
    try {
      await writeChangelogFile(baseDir, key, normalized);
    } catch (e) {}
    return normalized;
  } catch (e) {
    return [] as any[];
  }
}

export async function writeChangelogFile(
  baseDir: string,
  key: string,
  arr: any[],
) {
  const fp = changelogPath(baseDir, key);
  try {
    await fsp.writeFile(fp, JSON.stringify(arr, null, 2), "utf8");
  } catch (e) {}
}

export function normalizeChangelogArray(raw: any[]): Array<any> {
  if (!Array.isArray(raw)) return [];
  const out: Array<any> = [];

  for (const entry of raw) {
    const at = entry?.at ?? new Date().toISOString();
    const changesRaw = entry?.changes ?? [];
    const normalizedChanges: Array<any> = [];

    if (!Array.isArray(changesRaw)) continue;

    for (const ch of changesRaw) {
      if (!ch) continue;

      if (
        ch &&
        typeof ch === "object" &&
        ch.value &&
        typeof ch.value === "object"
      ) {
        for (const name of Object.keys(ch.value)) {
          const newObj = ch.value[name];
          if (!newObj || typeof newObj !== "object") continue;

          const filteredNew: Record<string, any> = {};
          for (const L of Object.keys(newObj)) {
            if (newObj[L] !== undefined) filteredNew[L] = newObj[L];
          }
          if (Object.keys(filteredNew).length === 0) continue;
          normalizedChanges.push({
            name,
            values: { old: null, new: filteredNew },
          });
        }
        continue;
      }

      if (ch && typeof ch === "object") {
        const keys = Object.keys(ch);
        if (
          keys.length === 1 &&
          ch[keys[0]] &&
          typeof ch[keys[0]] === "object"
        ) {
          const name = keys[0];
          const newObj = ch[name] as Record<string, any>;
          const filteredNew: Record<string, any> = {};
          for (const L of Object.keys(newObj)) {
            if (newObj[L] !== undefined) filteredNew[L] = newObj[L];
          }
          if (Object.keys(filteredNew).length === 0) continue;
          normalizedChanges.push({
            name,
            values: { old: null, new: filteredNew },
          });
          continue;
        }

        if (ch.name && ch.values) {
          const newFiltered: any = {};
          const oldFiltered: any = ch.values.old ?? null;
          if (ch.values.new && typeof ch.values.new === "object") {
            for (const L of Object.keys(ch.values.new)) {
              if (ch.values.new[L] !== undefined)
                newFiltered[L] = ch.values.new[L];
            }
          }
          if (Object.keys(newFiltered).length === 0) continue;
          normalizedChanges.push({
            name: ch.name,
            values: { old: oldFiltered, new: newFiltered },
          });
          continue;
        }
      }
    }

    if (normalizedChanges.length > 0)
      out.push({ at, changes: normalizedChanges });
  }

  return out;
}

export function diffValues(oldVal: any, newVal: any) {
  try {
    const out: Array<{ name: string; values: { old: any | null; new: any } }> =
      [];

    if (
      (typeof oldVal !== "object" || oldVal === null) &&
      (typeof newVal !== "object" || newVal === null)
    ) {
      if (oldVal !== newVal) {
        out.push({
          name: "value",
          values: { old: oldVal ?? null, new: newVal },
        });
      }
      return out;
    }

    if (typeof newVal !== "object" || newVal === null) {
      out.push({ name: "value", values: { old: oldVal ?? null, new: newVal } });
      return out;
    }

    const keys = new Set<string>([
      ...Object.keys(oldVal || {}),
      ...Object.keys(newVal || {}),
    ]);
    for (const k of keys) {
      const a = oldVal?.[k];
      const b = newVal?.[k];

      if (JSON.stringify(a) === JSON.stringify(b)) continue;

      if (a && b && typeof a === "object" && typeof b === "object") {
        const filteredNew: Record<string, any> = {};
        for (const L of Object.keys(b)) {
          if (b[L] !== undefined) filteredNew[L] = b[L];
        }

        if (Object.keys(filteredNew).length === 0) continue;

        const filteredOld: Record<string, any> = {};
        for (const L of Object.keys(filteredNew)) {
          if (a && a[L] !== undefined) filteredOld[L] = a[L];
        }
        out.push({
          name: k,
          values: {
            old: Object.keys(filteredOld).length ? filteredOld : null,
            new: filteredNew,
          },
        });
        continue;
      }

      if (b !== undefined)
        out.push({ name: k, values: { old: a ?? null, new: b } });
    }

    return out;
  } catch (e) {
    return [];
  }
}
