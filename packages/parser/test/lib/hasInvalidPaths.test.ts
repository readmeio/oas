import { describe, expect, it } from 'vitest';

import { hasInvalidPaths } from '../../src/lib/hasInvalidPaths.js';

describe('#hasInvalidPaths', () => {
  it('should detect paths without leading slashes', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        users: {},
        'users/{id}': {},
        '/valid-path': {},
      },
    };

    expect(hasInvalidPaths(api)).toBe(true);
  });

  it('should return false when all paths have leading slashes', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {},
        '/users/{id}': {},
        '/valid-path': {},
      },
    };

    expect(hasInvalidPaths(api)).toBe(false);
  });

  it('should handle API without paths', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    expect(hasInvalidPaths(api)).toBe(false);
  });
});
