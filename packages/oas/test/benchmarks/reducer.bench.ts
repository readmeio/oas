import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { bench, describe } from 'vitest';

import { OpenAPIReducer } from '../../src/reducer/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

describe('OpenAPIReducer', () => {
  bench(
    'petstore',
    async () => {
      OpenAPIReducer.init(structuredClone(petstore) as OASDocument)
        .byOperation('/store/order/{orderId}', 'Get')
        .reduce();
    },
    { warmupIterations: 2, iterations: 20 },
  );

  bench(
    'docusign (operation without circular refs)',
    async () => {
      OpenAPIReducer.init(docusign as OASDocument)
        .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/edit', 'post')
        .reduce();
    },
    { warmupIterations: 2, iterations: 20 },
  );

  bench(
    'docusign (operation with circular refs)',
    async () => {
      OpenAPIReducer.init(docusign as OASDocument)
        .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}', 'get')
        .reduce();
    },
    { warmupIterations: 2, iterations: 20 },
  );
});
