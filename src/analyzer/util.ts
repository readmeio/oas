import jp from 'jsonpath';

interface JSONPathResult {
  value: any;
  pointer: string;
}

/**
 * Run a set of JSONPath queries against an API definition.
 *
 * @see {@link https://jsonpath.com/}
 * @see {@link https://npm.im/jsonpath}
 */
export function query(queries: string[], definition: any): JSONPathResult[] {
  const results = queries
    .map(q => jp.nodes(definition, q))
    .filter(res => (res.length ? res : false))
    .reduce((prev, next) => prev.concat(next), [])
    .map(node => {
      const path = node.path.slice(1).map(p => String(p).split('/').join('~1'));

      return {
        // `jsonpath` has a `$` root reference, that we sliced off already, but we want `/` instead.
        pointer: `/${path.join('/')}`,
        value: node.value,
      };
    });

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
