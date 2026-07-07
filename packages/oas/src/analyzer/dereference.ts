import type { OASDocument } from '../types.js';
import type { ParserOptions } from '@readme/openapi-parser';

import { dereference } from '@readme/openapi-parser';

/**
 * Retrive our dereferencing configuration for `@readme/openapi-parser`.
 *
 */
function getDereferencingOptions(circularRefs: Set<string>): Pick<ParserOptions, 'resolve' | 'dereference'> {
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

interface DereferenceOasResult {
  api: OASDocument;
  circularRefs: string[];
}

interface DereferenceOasState {
  circularRefs: string[];
  complete: boolean;
  processing: boolean;
  promises: {
    reject: (err: unknown) => void;
    resolve: (result: DereferenceOasResult) => void;
  }[];
  result?: DereferenceOasResult;
}

const dereferenceStates = new WeakMap<OASDocument, DereferenceOasState>();

function getDereferenceState(definition: OASDocument): DereferenceOasState {
  let state = dereferenceStates.get(definition);
  if (!state) {
    state = {
      processing: false,
      complete: false,
      circularRefs: [],
      promises: [],
    };
    dereferenceStates.set(definition, state);
  }

  return state;
}

/**
 * Dereference a given OpenAPI definition so it can be parsed free from the hassle of resolving
 * `$ref` schemas and circular structures.
 *
 */
export async function dereferenceOas(
  definition: OASDocument,
  opts?: {
    /**
     * A callback method can be supplied to be called when dereferencing is complete. Used for
     * debugging that the multi-promise handling within this method works.
     *
     * @private
     */
    cb?: () => void;
  },
): Promise<DereferenceOasResult> {
  const state = getDereferenceState(definition);

  if (state.complete && state.result) {
    return state.result;
  }

  if (state.processing) {
    return new Promise((resolve, reject) => {
      state.promises.push({ resolve, reject });
    });
  }

  state.processing = true;

  const circularRefs: Set<string> = new Set();
  const dereferencingOptions = getDereferencingOptions(circularRefs);
  const { promises } = state;

  return dereference<OASDocument>(definition, dereferencingOptions)
    .then((dereferenced: OASDocument) => {
      const result: DereferenceOasResult = {
        api: dereferenced,
        circularRefs: [...circularRefs],
      };

      state.result = result;
      state.circularRefs = result.circularRefs;
      state.processing = false;
      state.complete = true;

      // Used for debugging that dereferencing promise awaiting works.
      if (opts?.cb) {
        opts.cb();
      }

      return result;
    })
    .then(result => {
      promises.forEach(deferred => deferred.resolve(result));
      state.promises = [];
      return result;
    })
    .catch(err => {
      state.processing = false;
      promises.forEach(deferred => deferred.reject(err));
      state.promises = [];
      throw err;
    });
}

/**
 * `dereferenceOas()` caches its result against whatever object reference it's given, but callers
 * that care about not mutating their original definition (like the analyzer) have historically had
 * to pass in a fresh `structuredClone()` on every call — which means that cache is only ever a hit
 * within a single call, never across separate analyses of the same definition.
 *
 * This wraps that up: it clones the given definition exactly once and reuses that same clone (and
 * therefore `dereferenceOas()`'s cached result for it) for every subsequent call with the same
 * original definition reference. This is what lets the analyzer dereference a large API definition
 * a single time and reuse that work across an analysis of every operation within it, instead of
 * re-dereferencing the whole thing per-operation.
 *
 * @param definition An OpenAPI definition to dereference.
 */
export function dereferenceOasShared(definition: OASDocument): Promise<DereferenceOasResult> {
  let clone = sharedClones.get(definition);
  if (!clone) {
    clone = structuredClone(definition);
    sharedClones.set(definition, clone);
  }

  return dereferenceOas(clone);
}

const sharedClones = new WeakMap<OASDocument, OASDocument>();
