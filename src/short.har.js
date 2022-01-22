module.exports = {
  log: {
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'GET',
          url: 'https://httpbin.org/get',
          httpVersion: 'HTTP/1.1',
          cookies: [],
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
            { name: 'Accept', value: '*/*' },
            { name: 'Accept-Encoding', value: 'gzip,deflate' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          content: {
            size: 404,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              origin: '127.0.0.1',
              url: 'https://httpbin.org/get',
            }),
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
