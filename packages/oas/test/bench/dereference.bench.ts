import type { HttpMethods, OASDocument } from '../../src/types.js';

import { readFileSync } from 'node:fs';
import nodePath from 'node:path';

import { bench, describe } from 'vitest';

import Oas from '../../src/index.js';

const __dirname = import.meta.dirname;

function loadJSON<T = object>(absPath: string): T {
  return JSON.parse(readFileSync(absPath, 'utf-8')) as T;
}

/**
 * Locate an oas-examples fixture. npm workspaces may hoist the package to the
 * repo root, so we try the local node_modules first, then fall back to the root.
 */
function resolveOasExample(name: string): string {
  const local = nodePath.resolve(__dirname, '..', '..', 'node_modules', '@readme', 'oas-examples', name);
  try {
    readFileSync(local);
    return local;
  } catch {
    return nodePath.resolve(__dirname, '..', '..', '..', '..', 'node_modules', '@readme', 'oas-examples', name);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const petstoreSpec = loadJSON<OASDocument>(resolveOasExample('3.0/json/petstore.json'));
const starTrekSpec = loadJSON<OASDocument>(resolveOasExample('3.0/json/star-trek.json'));

/**
 * Collect all (path, method) pairs from an Oas instance so we can iterate over
 * every operation without calling the heavy `getPaths()` during the bench loop.
 */
function collectOperationEntries(spec: OASDocument): Array<{ path: string; method: HttpMethods }> {
  const entries: Array<{ path: string; method: HttpMethods }> = [];
  const httpMethods = new Set<string>(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

  if (spec.paths) {
    for (const path of Object.keys(spec.paths)) {
      if (path.startsWith('x-')) continue;
      const pathItem = spec.paths[path];
      if (!pathItem) continue;
      for (const method of Object.keys(pathItem)) {
        if (httpMethods.has(method)) {
          entries.push({ path, method: method as HttpMethods });
        }
      }
    }
  }

  return entries;
}

const petstoreOps = collectOperationEntries(petstoreSpec);
const starTrekOps = collectOperationEntries(starTrekSpec);

// ---------------------------------------------------------------------------
// Benchmarks: Oas.dereference()  — whole-API-definition level
// ---------------------------------------------------------------------------

describe('Oas.dereference()', () => {
  bench('petstore (993 lines, ~20 ops)', async () => {
    const oas = Oas.init(structuredClone(petstoreSpec));
    await oas.dereference();
  });

  bench(
    'star-trek (16 000 lines, 120 ops)',
    async () => {
      const oas = Oas.init(structuredClone(starTrekSpec));
      await oas.dereference();
    },
    { warmupIterations: 2, iterations: 20 },
  );
});

// ---------------------------------------------------------------------------
// Benchmarks: Operation.dereference()  — per-operation pattern
//
// Each call creates a new $RefParser, structuredClones the operation schema,
// and passes the full paths + components to the parser.
// ---------------------------------------------------------------------------

describe('Operation.dereference() – single operation', () => {
  bench('petstore /pets GET', async () => {
    const oas = Oas.init(structuredClone(petstoreSpec));
    const op = oas.operation('/pets', 'get');
    await op.dereference();
  });

  bench('star-trek /animal/search POST', async () => {
    const oas = Oas.init(structuredClone(starTrekSpec));
    const op = oas.operation('/animal/search', 'post');
    await op.dereference();
  });
});

describe('Operation.dereference() – all operations', () => {
  bench(
    `petstore – all ${petstoreOps.length} operations`,
    async () => {
      const oas = Oas.init(structuredClone(petstoreSpec));
      for (const { path, method } of petstoreOps) {
        const op = oas.operation(path, method);
        await op.dereference();
      }
    },
    { warmupIterations: 2, iterations: 20 },
  );

  bench(
    `star-trek – all ${starTrekOps.length} operations`,
    async () => {
      const oas = Oas.init(structuredClone(starTrekSpec));
      for (const { path, method } of starTrekOps) {
        const op = oas.operation(path, method);
        await op.dereference();
      }
    },
    { warmupIterations: 1, iterations: 5 },
  );
});

// ---------------------------------------------------------------------------
// Benchmarks: whole-API vs per-operation cost comparison
//
// Quantifies the overhead of the per-operation pattern: dereferencing the
// whole API once versus dereferencing each operation individually.
// ---------------------------------------------------------------------------

describe('whole-API vs per-operation (petstore)', () => {
  bench(
    'Oas.dereference() once',
    async () => {
      const oas = Oas.init(structuredClone(petstoreSpec));
      await oas.dereference();
    },
    { warmupIterations: 3, iterations: 30 },
  );

  bench(
    `all ${petstoreOps.length} Operation.dereference() individually`,
    async () => {
      const oas = Oas.init(structuredClone(petstoreSpec));
      for (const { path, method } of petstoreOps) {
        const op = oas.operation(path, method);
        await op.dereference();
      }
    },
    { warmupIterations: 2, iterations: 30 },
  );
});
