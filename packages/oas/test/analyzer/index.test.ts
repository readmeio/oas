import type { OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { describe, it, expect } from 'vitest';

import analyzer from '../../src/analyzer/index.js';

describe('analyzer', () => {
  it('should should analyzer an OpenAPI definition', async () => {
    await expect(analyzer(petstore as OASDocument)).resolves.toMatchSnapshot();
  });
});
