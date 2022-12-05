import type { OASDocument } from '../../src/rmoas.types';

import analyzer from '../../src/analyzer';

let petstore: OASDocument;

describe('analyzer', () => {
  beforeAll(async () => {
    petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(r => r.default as OASDocument);
  });

  it('should should analyzer an OpenAPI definition', async () => {
    await expect(analyzer(petstore)).resolves.toMatchSnapshot();
  });
});
