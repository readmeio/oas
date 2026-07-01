import { describe, expect, it } from 'vitest';

import { isUnsafeURL } from '../../src/lib/urls.js';

describe('#isUnsafeURL', () => {
  it.each([
    '',
    '   ',
    'javascript:alert(1)', // oxlint-disable-line no-script-url
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'http://localhost/',
    'http://127.0.0.1/',
    'http://192.168.1.1/',
    'http://10.0.0.1/',
    'http://172.16.0.1/',
    'http://169.254.0.1/',
    'http://service.local/',
    'http://redis:6379/',
    'https://example.com:8080/',
    'http://db.example.com:27017',
    'http://::1',
    'https://fc00::1',
    'http://fe80::1',
    'https://::ffff:127.0.0.1',
  ])('should treat `%s` as unsafe', url => {
    expect(isUnsafeURL(url)).toBe(true);
  });

  it.each([
    'https://example.com/',
    'https://api.github.com/repos',
    'http://2001:4860:4860::8888',
    '/schemas/pet.json',
    './schemas/pet.json',
    '../schemas/pet.json',
  ])('should treat `%s` as safe', url => {
    expect(isUnsafeURL(url)).toBe(false);
  });
});
