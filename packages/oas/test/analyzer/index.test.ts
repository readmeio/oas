import type { OASDocument } from '../../src/types.js';

import { describe, beforeAll, it, expect } from 'vitest';

import analyzer from '../../src/analyzer/index.js';

let petstore: OASDocument;

describe('analyzer', () => {
  beforeAll(async () => {
    petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default as OASDocument);
  });

  it('should should analyzer an OpenAPI definition', async () => {
    await expect(analyzer(petstore)).resolves.toMatchSnapshot();
  });
});
