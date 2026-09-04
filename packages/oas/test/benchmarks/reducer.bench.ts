import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import trainTravel from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import { describe, test } from 'vitest';

import { OpenAPIReducer } from '../../src/reducer/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

describe('OpenAPIReducer', () => {
  test('petstore', async ({ bench }) => {
    await bench(
      'petstore',
      { iterations: 5 },
      async () => {
        OpenAPIReducer.init(structuredClone(petstore) as OASDocument)
          .byOperation('/store/order/{orderId}', 'Get')
          .reduce();
      },
    ).run();
  });

  test('docusign (operation without circular refs)', async ({ bench }) => {
    await bench(
      'docusign (operation without circular refs)',
      { iterations: 5 },
      async () => {
        OpenAPIReducer.init(docusign as OASDocument)
          .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/edit', 'post')
          .reduce();
      },
    ).run();
  });

  test('docusign (operation with circular refs)', async ({ bench }) => {
    await bench(
      'docusign (operation with circular refs)',
      { iterations: 5 },
      async () => {
        OpenAPIReducer.init(docusign as OASDocument)
          .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}', 'get')
          .reduce();
      },
    ).run();
  });

  test('train-travel (webhook operation)', async ({ bench }) => {
    await bench(
      'train-travel (webhook operation)',
      { iterations: 5 },
      async () => {
        OpenAPIReducer.init(structuredClone(trainTravel) as unknown as OASDocument)
          .byWebhook('newBooking')
          .reduce();
      },
    ).run();
  });
});
