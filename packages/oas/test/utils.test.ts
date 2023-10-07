import { test, expect } from 'vitest';

import { jsonSchemaTypes } from '../src/utils.js';

test('should expose `jsonSchemaTypes`', () => {
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
