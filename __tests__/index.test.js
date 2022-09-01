const fs = require('fs').promises;

const toBeAValidHAR = require('jest-expect-har').default;

const examples = require('..');

expect.extend({ toBeAValidHAR });

test('the main library export should export every available example', async () => {
  const availableExamples = await fs.readdir(`${__dirname}/../src`).then(dir => {
    return dir.map(file => file.replace('.har.js', ''));
  });

  expect(Object.keys(examples)).toMatchObject(availableExamples);
});

describe('examples', () => {
  describe.each(Object.keys(examples).map(har => [har, examples[har]]))('`%s`', (example, har) => {
    it('should be a valid HAR', async () => {
      await expect(har).toBeAValidHAR();
    });

    const itif = (() => {
      const response = har.log.entries[0].response;
      if (
        example === 'cookies' ||
        response.content.mimeType.includes('application/xml') ||
        response.content.mimeType.includes('text/html')
      ) {
        // These tests return specialized payloads that we don't need to check headers for.
        return it.skip;
      }

      return it;
    })();

    itif('should not contain any identifable information', () => {
      const response = har.log.entries[0].response;
      const content = JSON.parse(response.content.text);

      expect(content.headers['X-Amzn-Trace-Id']).toBeUndefined();
      expect(content.origin).toBe('127.0.0.1');
    });

    itif('should have the same headers documented `response.headers` and `response.content.headers`', () => {
      const response = har.log.entries[0].response;
      const content = JSON.parse(response.content.text);
      const expected = Object.entries(content.headers).map(([header, value]) => {
        // Unless we're fetching XML from httpbin our response content-type is always going to be JSON.
        // if (header === 'Content-Type' && ['application/x-www-form-urlencoded', 'application/xml'].includes(value)) {
        if (header === 'Content-Type') {
          return { name: header, value: 'application/json' };
        }

        return {
          name: header,
          // httpbin always sends us back the content-length header in its JSON payload as a string, but it's an int
          // in the actual header.
          value: header === 'Content-Length' ? parseInt(value, 10) : value,
        };
      });

      expect(response.headers).toStrictEqual(expected);
    });
  });
});
