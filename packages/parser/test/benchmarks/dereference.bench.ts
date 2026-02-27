import type { APIDocument } from '../../src/types.js';

import path from 'node:path';

import { bench, describe } from 'vitest';

import { dereference } from '../../src/index.js';
import circularSchema from '../specs/circular-slowdowns/schema.json' with { type: 'json' };
import largeSchema from '../specs/large-file-memory-leak/cloudflare.json' with { type: 'json' };
import smallSchema from '../specs/oas-relative-servers/v3-relative-server.json' with { type: 'json' };

describe('dereference()', () => {
  describe('stock', () => {
    bench('small schema (64 lines)', async () => {
      await dereference(structuredClone(smallSchema) as APIDocument);
    });

    bench('circular schema (2 800 lines)', async () => {
      await dereference(structuredClone(circularSchema) as APIDocument);
    });

    bench(
      'large schema - cloudflare (98 000 lines)',
      async () => {
        await dereference(structuredClone(largeSchema) as APIDocument);
      },
      { warmupIterations: 1, iterations: 5 },
    );
  });

  describe('circular handling', () => {
    bench('circular: true (default)', async () => {
      await dereference(structuredClone(circularSchema) as APIDocument);
    });

    bench('circular: "ignore"', async () => {
      await dereference(structuredClone(circularSchema) as APIDocument, { dereference: { circular: 'ignore' } });
    });

    bench('circular: "ignore" + onCircular callback', async () => {
      const refs = new Set<string>();
      await dereference(structuredClone(circularSchema) as APIDocument, {
        dereference: {
          circular: 'ignore',
          onCircular: (ref: string) => refs.add(ref),
        },
      });
    });
  });

  describe('file path support', () => {
    const __dirname = import.meta.dirname;

    bench('small schema (64 lines)', async () => {
      await dereference(path.resolve(__dirname, '..', 'specs/oas-relative-servers/v3-relative-server.json'));
    });

    bench('circular schema (2 800 lines)', async () => {
      await dereference(path.resolve(__dirname, '..', 'specs/circular-slowdowns/schema.json'));
    });
  });
});
