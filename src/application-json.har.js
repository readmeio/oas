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
              value: 'application/json',
            },
          ],
          queryString: [],
          postData: {
            mimeType: 'application/json',
            text: JSON.stringify({
              number: 1,
              string: 'f"oo',
              arr: [1, 2, 3],
              nested: { a: 'b' },
              arr_mix: [1, 'a', { arr_mix_nested: {} }],
              boolean: false,
            }),
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
            { name: 'Content-Length', value: 118 },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          content: {
            size: 597,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: {},
              data: '{"number":1,"string":"f\\"oo","arr":[1,2,3],"nested":{"a":"b"},"arr_mix":[1,"a",{"arr_mix_nested":{}}],"boolean":false}',
              files: {},
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '118',
                'Content-Type': 'application/json',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              json: {
                arr: [1, 2, 3],
                arr_mix: [1, 'a', { arr_mix_nested: {} }],
                boolean: false,
                nested: { a: 'b' },
                number: 1,
                string: 'f"oo',
              },
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
