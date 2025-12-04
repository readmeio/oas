import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import Oas from '../../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('getParametersAsJSONSchema() performance with caching', () => {
  it('should show performance improvement with built-in Oas cache', async () => {
    const filePath = join(__dirname, '../../../../oas-examples/3.0/json/lots-of-circular-refs.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const api = JSON.parse(fileContent);
    const oas = Oas.init(api);
    await oas.dereference();

    const operation = oas.operation('/users', 'post');

    // make sure to run the cache version first before the uncached
    // this way we can sort of cancel out the JIT warmup
    const iterations = 5;
    const withCacheTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      operation.getParametersAsJSONSchema();
      withCacheTimes.push(performance.now() - start);
    }

    const withoutCacheTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const freshOas = Oas.init(JSON.parse(fileContent));
      await freshOas.dereference();
      const freshOperation = freshOas.operation('/users', 'post');

      const start = performance.now();
      freshOperation.getParametersAsJSONSchema({ componentCache: null });
      withoutCacheTimes.push(performance.now() - start);
    }

    expect(withCacheTimes[1]).toBeLessThan(withCacheTimes[0] * 0.5);
    const cachedAvg = withCacheTimes.slice(1).reduce((a, b) => a + b, 0) / (iterations - 1);
    const uncachedAvg = withoutCacheTimes.slice(1).reduce((a, b) => a + b, 0) / (iterations - 1);
    expect(cachedAvg).toBeLessThan(uncachedAvg);
  }, 15000);

  it('should show cache works across multiple operations on same Oas instance', async () => {
    const filePath = join(__dirname, '../../../../oas-examples/3.0/json/lots-of-circular-refs.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const api = JSON.parse(fileContent);
    const oas = Oas.init(api);
    await oas.dereference();

    // Get all operations
    const operations = [
      oas.operation('/users', 'get'),
      oas.operation('/users', 'post'),
      oas.operation('/posts', 'get'),
      oas.operation('/posts', 'post'),
      oas.operation('/comments', 'get'),
      oas.operation('/comments', 'post'),
    ];

    const times: number[] = [];

    // Call getParametersAsJSONSchema on each operation
    for (const op of operations) {
      const start = performance.now();
      op.getParametersAsJSONSchema();
      times.push(performance.now() - start);
    }

    // First operation is slower (cache miss), subsequent should be faster (cache hit)
    const firstTime = times[0];
    const laterTimes = times.slice(1);
    const someFaster = laterTimes.some(t => t < firstTime * 0.5);

    expect(someFaster).toBe(true);
  }, 15000);
});
