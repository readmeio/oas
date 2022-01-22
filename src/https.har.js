module.exports = {
  log: {
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'GET',
          url: 'https://httpbin.org/status/200',
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
            { name: 'Content-Type', value: 'text/html; charset=utf-8' },
            { name: 'Content-Length', value: 0 },
          ],
          content: {
            size: 0,
            mimeType: 'text/html; charset=utf-8',
            text: '',
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
