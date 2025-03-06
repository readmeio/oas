import type { Har } from 'har-format';

import fs from 'node:fs/promises';

import toBeAValidHAR from 'jest-expect-har';
import { describe, test, it, expect } from 'vitest';

import examples from '../src/index.js';

expect.extend({ toBeAValidHAR });

test('export should export every available example', async () => {
  const availableExamples = await fs.readdir(`${import.meta.dirname}/../src`).then(dir => {
    return dir.filter(file => file !== 'index.ts').map(file => file.replace('.har.ts', ''));
  });

  expect(Object.keys(examples)).toMatchObject(availableExamples);
});

describe('examples', () => {
  describe.each(Object.keys(examples).map(har => [har, examples[har]]))('`%s`', (example, har: Har) => {
    it('should be a valid HAR', async () => {
      await expect(har).toBeAValidHAR();
    });

    const response = har.log.entries[0].response;

    // These tests return specialized payloads that we don't need to check headers for.
    const shouldSkip =
      example === 'cookies' ||
      response.content.mimeType.includes('application/xml') ||
      response.content.mimeType.includes('text/html');

    it.skipIf(shouldSkip)('should not contain any identifable information', () => {
      const content = JSON.parse(response.content.text || '');

      expect(content.headers).toBeDefined();
      expect(content.headers['X-Amzn-Trace-Id']).toBeUndefined();
      expect(content.origin).toBe('127.0.0.1');
    });

    it.skipIf(shouldSkip)(
      'should have the same headers documented `response.headers` and `response.content.headers`',
      () => {
        const content = JSON.parse(response.content.text || '');
        const expected = Object.entries<string>(content.headers).map(([header, value]) => {
          // Unless we're fetching XML from httpbin our response content-type is always going to be
          // JSON.
          if (header === 'Content-Type') {
            return { name: header, value: 'application/json' };
          }

          return {
            name: header,
            value,
          };
        });

        expect(response.headers).toStrictEqual(expected);
      },
    );
  });
});
