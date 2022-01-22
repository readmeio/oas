module.exports = {
  log: {
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'POST',
          url: 'https://httpbin.org/post?key=value',
          httpVersion: 'HTTP/1.1',
          cookies: [
            {
              name: 'foo',
              value: 'bar',
            },
            {
              name: 'bar',
              value: 'baz',
            },
          ],
          headers: [
            {
              name: 'accept',
              value: 'application/json',
            },
            {
              name: 'content-type',
              value: 'application/x-www-form-urlencoded',
            },
          ],
          queryString: [
            {
              name: 'foo',
              value: 'bar',
            },
            {
              name: 'foo',
              value: 'baz',
            },
            {
              name: 'baz',
              value: 'abc',
            },
          ],
          postData: {
            mimeType: 'application/x-www-form-urlencoded',
            params: [
              {
                name: 'foo',
                value: 'bar',
              },
            ],
          },
          bodySize: -1,
          headersSize: -1,
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/1.1',
          headers: [
            { name: 'Accept', value: 'application/json' },
            { name: 'Accept-Encoding', value: 'gzip,deflate' },
            { name: 'Content-Length', value: 7 },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Cookie', value: 'foo=bar; bar=baz' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          content: {
            size: 744,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: { baz: 'abc', foo: 'baz', key: 'value?foo=bar' },
              data: '',
              files: {},
              form: { foo: 'bar' },
              headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '7',
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: 'foo=bar; bar=baz',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              json: null,
              origin: '127.0.0.1',
              url: 'https://httpbin.org/post?key=value%3Ffoo=bar&foo=baz&baz=abc',
            }),
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
