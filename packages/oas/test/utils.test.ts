import { describe, expect, it } from 'vitest';

import { jsonSchemaTypes } from '../src/utils.js';

describe('utils', () => {
  it('should expose `jsonSchemaTypes`', () => {
    expect(jsonSchemaTypes).toStrictEqual({
      path: 'Path Params',
      query: 'Query Params',
      body: 'Body Params',
      cookie: 'Cookie Params',
      formData: 'Form Data',
      header: 'Headers',
      metadata: 'Metadata',
    });
  });
});
