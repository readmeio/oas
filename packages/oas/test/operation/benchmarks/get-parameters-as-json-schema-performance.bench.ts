/**
 * IMPORTANT: Vitest bench measures steady-state throughput after V8 JIT optimization.
 * After ~10,000 iterations, both cached and uncached paths become equally fast due to:
 * - JIT compilation optimizing both hot paths
 * - V8 inline caching for object property access
 *
 * For real-world cold-start performance (what users actually experience), see the
 * companion test file:
 *
 * @see {@link get-parameters-as-json-schema-performance.test.ts}
 */
import type { SchemaObject } from '../../../src/types.js';

import sampleLargeApi from '@readme/oas-examples/3.0/json/lots-of-circular-paths.json' with { type: 'json' };
import { beforeAll, bench, describe } from 'vitest';

import Oas from '../../../src/index.js';
import { getParametersAsJSONSchema } from '../../../src/operation/lib/get-parameters-as-json-schema.js';

let oas: Oas;
let operations: ReturnType<Oas['operation']>[];

beforeAll(async () => {
  oas = Oas.init(sampleLargeApi);
  await oas.dereference();

  const apiPaths = Object.keys(sampleLargeApi.paths);
  const testPaths = apiPaths.slice(0, 5);
  operations = [];

  for (const path of testPaths) {
    const pathItem = sampleLargeApi.paths[path];
    const httpMethods = Object.keys(pathItem).filter(
      httpMethod => !['parameters', 'servers', 'summary', 'description'].includes(httpMethod),
    ) as ('get' | 'post' | 'put' | 'patch' | 'delete')[];

    if (httpMethods.length > 0) {
      operations.push(oas.operation(path, httpMethods[0]));
    }
  }

  operations[0]?.getParametersAsJSONSchema();
});

describe('getParametersAsJSONSchema performance benchmarks', () => {
  bench('without component cache (5 operations)', () => {
    operations.forEach(operation => {
      getParametersAsJSONSchema(
        operation,
        oas.api,
        {
          includeDiscriminatorMappingRefs: true,
          transformer: (s: SchemaObject) => s,
        },
        null,
        undefined,
      );
    });
  });

  bench('with component cache (5 operations)', () => {
    operations.forEach(operation => {
      operation.getParametersAsJSONSchema();
    });
  });
});
