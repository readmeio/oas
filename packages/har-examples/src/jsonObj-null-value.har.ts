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
          method: 'POST',
          url: 'https://httpbin.org/post',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [
            {
              name: 'content-type',
              value: 'application/json',
            },
          ],
          queryString: [],
          postData: {
            mimeType: 'application/json',
            text: '{"foo":null}',
          },
          bodySize: -1,
          headersSize: -1,
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/1.1',
          headers: [
            { name: 'Accept', value: '*/*' },
            { name: 'Accept-Encoding', value: 'gzip,deflate' },
            { name: 'Content-Length', value: '12' },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          cookies: [],
          content: {
            size: 605,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: {},
              data: '{"foo":null}',
              files: {},
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '12',
                'Content-Type': 'application/json',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              json: { foo: null },
              origin: '127.0.0.1',
              url: 'https://httpbin.org/post',
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
