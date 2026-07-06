import type { OASDocument } from '../../src/types.js';

import { bench, describe } from 'vitest';

import { analyzeOperation, analyzer } from '../../src/analyzer/index.js';
import { OpenAPIReducer } from '../../src/reducer/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * Grab the first `count` operations out of a definition, in whatever order `Object.keys()` hands
 * paths and methods back in.
 *
 */
function sampleOperations(definition: OASDocument, count: number): [string, string][] {
  const operations: [string, string][] = [];

  Object.keys(definition.paths || {}).forEach(path => {
    if (operations.length >= count) {
      return;
    }

    Object.keys((definition.paths as Record<string, Record<string, unknown>>)[path] || {}).forEach(method => {
      if (httpMethods.includes(method.toLowerCase())) {
        operations.push([path, method]);
      }
    });
  });

  return operations.slice(0, count);
}

const docusignDefinition = docusign as unknown as OASDocument;
const operations = sampleOperations(docusignDefinition, 50);

describe('per-operation analysis (docusign, 50 operations)', () => {
  bench(
    'OpenAPIReducer.reduce() + analyzer() per operation',
    async () => {
      for (const [path, method] of operations) {
        const reduced = OpenAPIReducer.init(structuredClone(docusignDefinition)).byOperation(path, method).reduce();

        // We're intentionally analyzing operations one at a time here, not in parallel: this is
        // simulating the real batch-processing workload (analyzing hundreds of operations out of
        // the same definition, serially) that this benchmark exists to measure.
        // oxlint-disable-next-line no-await-in-loop
        await analyzer(reduced);
      }
    },
    { iterations: 3 },
  );

  bench(
    'analyzeOperation() against the full, unreduced definition',
    async () => {
      for (const [path, method] of operations) {
        // oxlint-disable-next-line no-await-in-loop
        await analyzeOperation(docusignDefinition, path, method);
      }
    },
    { iterations: 3 },
  );
});
