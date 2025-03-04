module.exports = {
  log: {
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'GET',
          url: 'https://httpbin.org/get?key=value',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          queryString: [
            { name: 'foo', value: 'bar' },
            { name: 'foo', value: 'baz' },
            { name: 'baz', value: 'abc' },
          ],
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
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          content: {
            size: 495,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: { baz: 'abc', foo: ['bar', 'baz'], key: 'value' },
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              origin: '127.0.0.1',
              url: 'https://httpbin.org/get?key=value&foo=bar&foo=baz&baz=abc',
            }),
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
