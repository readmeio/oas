import nock from 'nock';
import { describe, expect, it, afterEach } from 'vitest';

import { assertSafeURL, fetchSafeURL } from '../../src/lib/fetch.js';

describe('#assertSafeURL', () => {
  it('should reject IPv4-mapped IMDS addresses', async () => {
    await expect(assertSafeURL('http://[::ffff:169.254.169.254]/latest/meta-data/')).rejects.toThrow(
      'Sorry, we cannot access http://[::ffff:169.254.169.254]/latest/meta-data/',
    );
  });

  it('should reject plain IMDS addresses', async () => {
    await expect(assertSafeURL('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      'Sorry, we cannot access http://169.254.169.254/latest/meta-data/',
    );
  });

  it('should allow public HTTPS URLs', async () => {
    await expect(assertSafeURL('https://example.com/openapi.json')).resolves.toBeUndefined();
  });
});

describe('#fetchSafeURL', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch a public HTTPS URL', async () => {
    nock('https://example.com').get('/openapi.json').reply(200, '{"openapi":"3.0.0"}');

    const response = await fetchSafeURL('https://example.com/openapi.json');
    await expect(response.text()).resolves.toBe('{"openapi":"3.0.0"}');
  });

  it('should not follow redirects onto private IPs', async () => {
    nock('https://example.com').get('/openapi.json').reply(302, undefined, {
      Location: 'http://169.254.169.254/latest/meta-data/',
    });

    nock('http://169.254.169.254').get('/latest/meta-data/').reply(200, 'SECRET');

    await expect(fetchSafeURL('https://example.com/openapi.json')).rejects.toThrow(
      'Sorry, we cannot access http://169.254.169.254/latest/meta-data/',
    );
  });

  it('should not follow redirects onto IPv4-mapped IMDS', async () => {
    nock('https://example.com').get('/openapi.json').reply(302, undefined, {
      Location: 'http://[::ffff:169.254.169.254]/latest/meta-data/',
    });

    // `URL` canonicalizes IPv4-mapped literals to hex form (`::ffff:a9fe:a9fe`).
    await expect(fetchSafeURL('https://example.com/openapi.json')).rejects.toThrow(
      /Sorry, we cannot access http:\/\/\[::ffff:(?:169\.254\.169\.254|a9fe:a9fe)\]\/latest\/meta-data\//,
    );
  });
});
