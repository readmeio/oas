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
              value: 'multipart/form-data',
            },
          ],
          queryString: [],
          postData: {
            mimeType: 'multipart/form-data',
            params: [
              {
                name: 'foo',
                value:
                  'data:image/png;name=owlbert.png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAMCAYAAABbayygAAABV0lEQVR4AWNwL/Bh0FGQ9FWUENUGsZExPz8/h5gArzmIDRZw1VfpSfeyagIJgiRBYkCg7mOl72akIt0KVwhSVB5o9SPESutJWajzquJgx/lRDganc7zNX3obq9SiKKxN8P/fmB33vybc7j+MHe1k8t9RSy4NrrA4K2Xp1k0b/peUlPzPjfL5v3bpgv9NTc3/48JD/sOsBju4JDnq6MS+3v9uLlb/pzeY/l82r+9/cIA/GNtrK2wFqQH7uDzY/gXQOrBpbemi/xO9DH4B2WCrQe4GqWHQVRDfBnLXpDTX/z3xTii4xM/if4iF5n+QGgZjZamvIIH5RT5wPKvQC0wDDQAr1FMQ/8YgK8zfAzIeqgCOp+V5gBW6Giq9A6kB+9pUXTiqINjwJ9B6uKKmBHuwW7XkhFeAYg2sMMWXQTvJh/2Uu6nciTgXvVsg7Gsp+xAkZqHPIA1SAwCKnrxJusHahgAAAABJRU5ErkJggg==',
                fileName: 'owlbert.png',
                contentType: 'image/png',
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
            { name: 'Accept', value: '*/*' },
            { name: 'Accept-Encoding', value: 'gzip,deflate' },
            { name: 'Content-Length', value: 754 },
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Host', value: 'httpbin.org' },
            { name: 'User-Agent', value: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)' },
          ],
          content: {
            size: 1195,
            mimeType: 'application/json',
            text: JSON.stringify({
              args: {},
              data: '',
              files: {
                foo: 'data:image/png;name=owlbert.png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAMCAYAAABbayygAAABV0lEQVR4AWNwL/Bh0FGQ9FWUENUGsZExPz8/h5gArzmIDRZw1VfpSfeyagIJgiRBYkCg7mOl72akIt0KVwhSVB5o9SPESutJWajzquJgx/lRDganc7zNX3obq9SiKKxN8P/fmB33vybc7j+MHe1k8t9RSy4NrrA4K2Xp1k0b/peUlPzPjfL5v3bpgv9NTc3/48JD/sOsBju4JDnq6MS+3v9uLlb/pzeY/l82r+9/cIA/GNtrK2wFqQH7uDzY/gXQOrBpbemi/xO9DH4B2WCrQe4GqWHQVRDfBnLXpDTX/z3xTii4xM/if4iF5n+QGgZjZamvIIH5RT5wPKvQC0wDDQAr1FMQ/8YgK8zfAzIeqgCOp+V5gBW6Giq9A6kB+9pUXTiqINjwJ9B6uKKmBHuwW7XkhFeAYg2sMMWXQTvJh/2Uu6nciTgXvVsg7Gsp+xAkZqHPIA1SAwCKnrxJusHahgAAAABJRU5ErkJggg==',
              },
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '754',
                'Content-Type': 'multipart/form-data; boundary=form-data-boundary-1ok8gx5czzite9j3',
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
