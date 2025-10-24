import { describe, expect, it } from 'vitest';

import { detectNoSlashPaths } from '../../src/lib/detectNoSlashPaths.js';

describe('detectNoSlashPaths', () => {
  it('should detect paths without leading slashes', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        users: {},
        'users/{id}': {},
        '/valid-path': {},
        '{param}': {},
      },
    };

    const noSlashPaths = detectNoSlashPaths(api);
    expect(noSlashPaths).toEqual(['users', 'users/{id}']);
  });

  it('should return empty array when all paths have leading slashes', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {},
        '/users/{id}': {},
        '/valid-path': {},
      },
    };

    const noSlashPaths = detectNoSlashPaths(api);
    expect(noSlashPaths).toEqual([]);
  });

  it('should handle API without paths', () => {
    const api = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    const noSlashPaths = detectNoSlashPaths(api);
    expect(noSlashPaths).toEqual([]);
  });
});
