/** biome-ignore-all lint/performance/noAwaitInLoops: These benchmarks must be run sequentially. */
import type { HttpMethods, OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import starTrek from '@readme/oas-examples/3.0/json/star-trek.json' with { type: 'json' };
import trainTravel from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import { bench, describe } from 'vitest';

import Oas from '../../src/index.js';
import { supportedMethods } from '../../src/utils.js';

function collectOperations(spec: OASDocument): { path: string; method: HttpMethods }[] {
  const oas = Oas.init(spec);
  const entries: { path: string; method: HttpMethods }[] = [];

  Object.entries(oas.getPaths()).forEach(([path, pathItem]) => {
    Object.keys(pathItem).forEach(method => {
      if (supportedMethods.includes(method as HttpMethods)) {
        entries.push({ path, method: method as HttpMethods });
      }
    });
  });

  return entries;
}

const petstoreOps = collectOperations(petstore as OASDocument);
const starTrekOps = collectOperations(starTrek as OASDocument);
const trainTravelOps = collectOperations(trainTravel as unknown as OASDocument);

describe('Oas.dereference()', () => {
  bench(
    'petstore (1,000 lines, ~20 ops)',
    async () => {
      const oas = Oas.init(structuredClone(petstore));
      await oas.dereference();
    },
    { warmupIterations: 2, iterations: 20 },
  );

  bench(
    'star-trek (16,000 lines, ~120 ops)',
    async () => {
      const oas = Oas.init(structuredClone(starTrek));
      await oas.dereference();
    },
    { warmupIterations: 2, iterations: 20 },
  );

  bench(
    'train-travel (1,500 lines, ~7 ops)',
    async () => {
      const oas = Oas.init(structuredClone(trainTravel));
      await oas.dereference();
    },
    { warmupIterations: 2, iterations: 20 },
  );
});

describe('Operation.dereference()', () => {
  describe('single operation', () => {
    bench('petstore `GET /pets`', async () => {
      const oas = Oas.init(structuredClone(petstore));
      const op = oas.operation('/pets', 'get');
      await op.dereference();
    });

    bench('star-trek `POST /animal/search`', async () => {
      const oas = Oas.init(structuredClone(starTrek));
      const op = oas.operation('/animal/search', 'post');
      await op.dereference();
    });

    bench('train-travel `GET /trips`', async () => {
      const oas = Oas.init(structuredClone(trainTravel));
      const op = oas.operation('/trips', 'get');
      await op.dereference();
    });
  });

  describe('all operations sequentially', () => {
    bench(
      `petstore - all ${petstoreOps.length} operations`,
      async () => {
        const oas = Oas.init(structuredClone(petstore));
        for (const { path, method } of petstoreOps) {
          const op = oas.operation(path, method as HttpMethods);
          await op.dereference();
        }
      },
      { warmupIterations: 2, iterations: 20 },
    );

    bench(
      `star-trek - all ${starTrekOps.length} operations`,
      async () => {
        const oas = Oas.init(structuredClone(starTrek));
        for (const { path, method } of starTrekOps) {
          const op = oas.operation(path, method);
          await op.dereference();
        }
      },
      { warmupIterations: 1, iterations: 5 },
    );

    bench(
      `train-travel - all ${trainTravelOps.length} operations`,
      async () => {
        const oas = Oas.init(structuredClone(trainTravel));

        for (const { path, method } of trainTravelOps) {
          const op = oas.operation(path, method);
          await op.dereference();
        }
      },
      { warmupIterations: 1, iterations: 5 },
    );
  });
});

describe('whole-API vs per-operation (petstore)', () => {
  bench(
    'Oas.dereference() once',
    async () => {
      const oas = Oas.init(structuredClone(petstore));
      await oas.dereference();
    },
    { warmupIterations: 3, iterations: 30 },
  );

  bench(
    `all ${petstoreOps.length} Operation.dereference() individually`,
    async () => {
      const oas = Oas.init(structuredClone(petstore));
      for (const { path, method } of petstoreOps) {
        const op = oas.operation(path, method);
        await op.dereference();
      }
    },
    { warmupIterations: 2, iterations: 30 },
  );
});
