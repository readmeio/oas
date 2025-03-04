module.exports = {
  log: {
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
              value: 'text/plain',
            },
          ],
          queryString: [],
          postData: {
            mimeType: 'text/plain',
            text: 'Hello World',
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
            { name: 'Content-Length', value: 11 },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          content: {
            size: 543,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: {},
              data: 'Hello World',
              files: {},
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '11',
                'Content-Type': 'text/plain',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              json: null,
              origin: '127.0.0.1',
              url: 'https://httpbin.org/post',
            }),
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
