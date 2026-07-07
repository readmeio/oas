import type { JSONPathResult } from './util.js';

import { query } from './util.js';

const cache = new WeakMap<object, Map<string, JSONPathResult[]>>();

/**
 * Every analyzer query in `queries/openapi.ts` runs one or more `$..`-style JSONPath scans across
 * the *entire* API definition, regardless of which operation (if any) we're ultimately interested
 * in. When analyzing a single operation that's cheap to do once, but when analyzing hundreds of
 * operations out of the same definition — which is the whole point of being able to scope analysis
 * to an operation instead of reducing the definition down first — re-running those same full-document
 * scans for every single operation throws away all of that shared work.
 *
 * This cache runs each unique set of JSONPath queries against a given definition exactly once and
 * hands back the same result array on every subsequent call, so callers can cheaply filter it down
 * per-operation instead of re-scanning the whole document each time.
 *
 * Cache entries are keyed by object identity (via `WeakMap`), so this is only effective when
 * callers reuse the same `definition` reference across calls — if you're handed a fresh clone every
 * time there's nothing to reuse. It also means definitions are never manually evicted from the
 * cache; they simply fall out of it once nothing else references them.
 *
 * @param queries JSONPath queries to run.
 * @param definition The object to run them against.
 */
export function queryCached(queries: string[], definition: object): JSONPathResult[] {
  let byQuery = cache.get(definition);
  if (!byQuery) {
    byQuery = new Map();
    cache.set(definition, byQuery);
  }

  // A space can't appear within a JSONPath query, so it's a safe delimiter to join on for a cache key.
  const cacheKey = queries.join(' ');

  let results = byQuery.get(cacheKey);
  if (!results) {
    results = query(queries, definition);
    byQuery.set(cacheKey, results);
  }

  return results;
}
