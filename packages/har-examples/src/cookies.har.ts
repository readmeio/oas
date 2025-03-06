import type { Har } from 'har-format';

const har: Har = {
  log: {
    version: '1.2',
    creator: {
      name: 'ReadMe',
      version: '1.0',
    },
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'GET',
          url: 'https://httpbin.org/cookies',
          httpVersion: 'HTTP/1.1',
          cookies: [
            { name: 'foo', value: 'bar' },
            { name: 'bar', value: 'baz' },
          ],
          headers: [],
          queryString: [],
          bodySize: -1,
          headersSize: -1,
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/1.1',
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Content-Length', value: '59' },
          ],
          cookies: [],
          content: {
            size: 59,
            mimeType: 'application/json',
            text: JSON.stringify({
              cookies: {
                bar: 'baz',
                foo: 'bar',
              },
            }),
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1,
        },
        cache: {},
        timings: {
          wait: 0,
          receive: 0,
        },
      },
    ],
  },
};

export default har;
