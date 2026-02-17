import type { ParserOptions } from '@readme/openapi-parser';

export function getDereferencingOptions(circularRefs: Set<string>): Pick<ParserOptions, 'resolve' | 'dereference'> {
  return {
    resolve: {
      // We shouldn't be resolving external pointers at this point so just ignore them.
      external: false,
    },
    dereference: {
      // If circular `$refs` are ignored they'll remain in the schema as `$ref: String`, otherwise
      // `$ref` just won't exist. This, in tandem with `onCircular`, allows us to do easy and
      // accumulate a list of circular references.
      circular: 'ignore',

      onCircular: (path: string) => {
        // The circular references that are coming out of `json-schema-ref-parser` are prefixed
        // with the schema path (file path, URL, whatever) that the schema exists in. Because we
        // don't care about this information for this reporting mechanism, and only the `$ref`
        // pointer, we're removing it.
        circularRefs.add(`#${path.split('#')[1]}`);
      },
    },
  };
}
