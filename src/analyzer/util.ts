import { JSONPath } from 'jsonpath-plus';

interface JSONPathResult {
  path: string;
  value: any;
  parent: any;
  parentProperty: string;
  hasArrExpr?: boolean;
  pointer: string;
}

/**
 * Run a set of JSONPath queries against an API definition.
 *
 * @see {@link https://jsonpath.com/}
 * @see {@link https://npm.im/jsonpath-plus}
 */
export function query(queries: string[], definition: any): JSONPathResult[] {
  const results = queries
    .map(q => JSONPath({ path: q, json: definition, resultType: 'all' }))
    .filter(res => (res.length ? res : false))
    .reduce((prev, next) => prev.concat(next), []);

  // Always alphabetize our results by the JSON pointer.
  results.sort((a: JSONPathResult, b: JSONPathResult) => {
    if (a.pointer < b.pointer) {
      return -1;
    } else if (a.pointer > b.pointer) {
      return 1;
    }

    return 0;
  });

  return results;
}

/**
 * Transform a JSON pointer into a JSON Schema `$ref`-compatible pointer.
 *
 * @example `/paths/~1streams/post/callbacks` -> `#/paths/~1streams/post/callbacks`
 */
export function refizePointer(pointer: string) {
  return `#${pointer}`;
}
