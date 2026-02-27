import nodePath from 'node:path';
import { readFileSync } from 'node:fs';

import { bench, describe } from 'vitest';

import { bundle, dereference, parse, validate } from '../../src/index.js';

const __dirname = import.meta.dirname;

/**
 * Resolves a path relative to the test/ directory (mirrors the `relativePath` helper used
 * by the regular test suite, and accounts for the CWD change performed by vitest.setup.ts).
 */
function fixturePath(file: string): string {
  return nodePath.resolve(__dirname, '..', file);
}

/**
 * Reads and JSON-parses a fixture file so we can pass schema objects directly,
 * avoiding file-I/O in the measured benchmark loop.
 */
function loadJSON<T = object>(file: string): T {
  return JSON.parse(readFileSync(fixturePath(file), 'utf-8')) as T;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// ~64 lines – minimal OpenAPI 3.0 spec with a few paths + relative servers
const smallSchema = loadJSON('specs/oas-relative-servers/v3-relative-server.json');

// ~2 800 lines / 99 KB – OpenAPI 3.0 spec with 23 circular $ref pointers
const circularSchema = loadJSON('specs/circular-slowdowns/schema.json');

// ~98 000 lines / ~5 MB – Cloudflare OpenAPI spec (real-world, very large)
const largeSchema = loadJSON('specs/large-file-memory-leak/cloudflare.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fresh deep copy of a schema object. We structuredClone before each
 * benchmark iteration because dereference/validate mutate the input.
 */
function clone<T>(obj: T): T {
  return structuredClone(obj);
}

// ---------------------------------------------------------------------------
// Benchmarks: parse()  — baseline, no $ref resolution
// ---------------------------------------------------------------------------

describe('parse()', () => {
  bench('small schema (64 lines)', async () => {
    await parse(clone(smallSchema));
  });

  bench('circular schema (2 800 lines)', async () => {
    await parse(clone(circularSchema));
  });

  bench('large schema – cloudflare (98 000 lines)', async () => {
    await parse(clone(largeSchema));
  });
});

// ---------------------------------------------------------------------------
// Benchmarks: dereference()  — the primary target for optimisation
// ---------------------------------------------------------------------------

describe('dereference()', () => {
  bench('small schema (64 lines)', async () => {
    await dereference(clone(smallSchema));
  });

  bench('circular schema (2 800 lines)', async () => {
    await dereference(clone(circularSchema));
  });

  bench(
    'large schema – cloudflare (98 000 lines)',
    async () => {
      await dereference(clone(largeSchema));
    },
    { warmupIterations: 1, iterations: 5 },
  );
});

// ---------------------------------------------------------------------------
// Benchmarks: dereference() with circular-ref options
// ---------------------------------------------------------------------------

describe('dereference() – circular handling', () => {
  bench('circular: true (default)', async () => {
    await dereference(clone(circularSchema));
  });

  bench('circular: "ignore"', async () => {
    await dereference(clone(circularSchema), { dereference: { circular: 'ignore' } });
  });

  bench('circular: "ignore" + onCircular callback', async () => {
    const refs = new Set<string>();
    await dereference(clone(circularSchema), {
      dereference: {
        circular: 'ignore',
        onCircular: (path: string) => refs.add(path),
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Benchmarks: bundle()
// ---------------------------------------------------------------------------

describe('bundle()', () => {
  bench('small schema (64 lines)', async () => {
    await bundle(clone(smallSchema));
  });

  bench('circular schema (2 800 lines)', async () => {
    await bundle(clone(circularSchema));
  });

  bench(
    'large schema – cloudflare (98 000 lines)',
    async () => {
      await bundle(clone(largeSchema));
    },
    { warmupIterations: 1, iterations: 5 },
  );
});

// ---------------------------------------------------------------------------
// Benchmarks: validate()  — dereference + schema/spec validation
// ---------------------------------------------------------------------------

describe('validate()', () => {
  bench('small schema (64 lines)', async () => {
    await validate(clone(smallSchema));
  });

  bench('circular schema (2 800 lines)', async () => {
    await validate(clone(circularSchema));
  });

  bench(
    'large schema – cloudflare (98 000 lines)',
    async () => {
      await validate(clone(largeSchema));
    },
    { warmupIterations: 1, iterations: 5 },
  );
});

// ---------------------------------------------------------------------------
// Benchmarks: dereference() from file path (includes I/O)
// ---------------------------------------------------------------------------

describe('dereference() from file path', () => {
  bench('small schema (64 lines)', async () => {
    await dereference(fixturePath('specs/oas-relative-servers/v3-relative-server.json'));
  });

  bench('circular schema (2 800 lines)', async () => {
    await dereference(fixturePath('specs/circular-slowdowns/schema.json'));
  });
});
