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
              value: 'application/zip',
            },
          ],
          queryString: [],
          postData: {
            mimeType: 'application/zip',
            text: 'data:application/zip;name=owlbert.zip;base64,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',
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
            { name: 'Content-Length', value: '2785' },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          cookies: [],
          content: {
            size: 597,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: {},
              data: 'data:application/zip;name=owlbert.zip;base64,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',
              files: {},
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '2785',
                'Content-Type': 'application/zip',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              json: null,
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
