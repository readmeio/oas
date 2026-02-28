import type { APIDocument } from '../../src/types.js';

import { bench, describe } from 'vitest';

import { bundle } from '../../src/index.js';
import circularSchema from '../specs/circular-slowdowns/schema.json' with { type: 'json' };
import largeSchema from '../specs/large-file-memory-leak/cloudflare.json' with { type: 'json' };
import smallSchema from '../specs/oas-relative-servers/v3-relative-server.json' with { type: 'json' };

describe('bundle()', () => {
  bench('small schema', async () => {
    await bundle(structuredClone(smallSchema) as APIDocument);
  });

  bench('circular schema', async () => {
    await bundle(structuredClone(circularSchema) as APIDocument);
  });

  bench(
    'large schema - cloudflare',
    async () => {
      await bundle(structuredClone(largeSchema) as APIDocument);
    },
    { warmupIterations: 1, iterations: 5 },
  );
});
