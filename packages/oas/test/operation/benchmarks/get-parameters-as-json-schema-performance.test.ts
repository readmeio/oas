/**
 * Real-world cold-start performance test for getParametersAsJSONSchema.
 *
 * This test runs only 3 iterations per operation, capturing performance BEFORE
 * V8's JIT compiler has fully optimized the code paths. This represents what
 * users actually experience in real-world scenarios (typically ~4-5x speedup with caching).
 *
 * For steady-state throughput under sustained load, see the companion benchmark file:
 * @see {@link get-parameters-as-json-schema-performance.bench.ts} (note: JIT optimization masks cache benefit there)
 */
import type { SchemaObject } from '../../../src/types.js';

import sampleLargeApi from '@readme/oas-examples/3.0/json/lots-of-circular-paths.json' with { type: 'json' };
import { describe, it } from 'vitest';

import Oas from '../../../src/index.js';
import { getParametersAsJSONSchema } from '../../../src/operation/lib/get-parameters-as-json-schema.js';

/**
 * Performance test for getParametersAsJSONSchema with and without cache.
 * This test manually calculates operation times and prints results to console.
 */
describe('getParametersAsJSONSchema performance test', () => {
  it('should test performance with and without cache', async () => {
    const oas = Oas.init(sampleLargeApi);
    await oas.dereference();

    const apiPaths = Object.keys(sampleLargeApi.paths);

    const testPaths = apiPaths.slice(0, 5);
    const operations: Array<{ path: string; method: string; operation: ReturnType<Oas['operation']> }> = [];

    for (const path of testPaths) {
      const pathItem = sampleLargeApi.paths[path];
      const httpMethods = Object.keys(pathItem).filter(
        httpMethod => !['parameters', 'servers', 'summary', 'description'].includes(httpMethod),
      ) as Array<'get' | 'post' | 'put' | 'patch' | 'delete'>;

      if (httpMethods.length > 0) {
        const method = httpMethods[0];
        operations.push({
          path,
          method,
          operation: oas.operation(path, method),
        });
      }
    }

    // Test without cache
    const noCacheTimes: number[] = [];
    const iterations = 3;

    for (const { operation } of operations) {
      const times: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
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
        const end = performance.now();
        times.push(end - start);
      }
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      noCacheTimes.push(avgTime);
    }

    const noCacheTotal = noCacheTimes.reduce((a, b) => a + b, 0);
    const noCacheAvg = noCacheTotal / noCacheTimes.length;

    // Test with cache
    const cacheTimes: number[] = [];

    for (const { operation } of operations) {
      const times: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        operation.getParametersAsJSONSchema();
        const end = performance.now();
        times.push(end - start);
      }
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      cacheTimes.push(avgTime);
    }

    const cacheTotal = cacheTimes.reduce((a, b) => a + b, 0);
    const cacheAvg = cacheTotal / cacheTimes.length;

    // Summary
    const improvement = ((noCacheAvg - cacheAvg) / noCacheAvg) * 100;
    const speedup = noCacheAvg / cacheAvg;

    // biome-ignore lint/suspicious/noConsole: we're intentionally logging to console for manual inspection
    console.log(
      `Performance improvement: ${improvement.toFixed(1)}% faster, ${noCacheTotal.toFixed(2)}ms -> ${cacheTotal.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`,
    );
  });
});
