module.exports = {
  log: {
    entries: [
      {
        startedDateTime: new Date().toISOString(),
        time: new Date().getMilliseconds(),
        request: {
          method: 'GET',
          url: 'https://httpbin.org/anything',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          queryString: [
            {
              name: 'stringPound',
              value: 'something%26nothing%3Dtrue',
            },
            { name: 'stringHash', value: 'hash%23data' },
            { name: 'stringArray', value: 'where%5B4%5D%3D10' },
            {
              name: 'stringWeird',
              value: 'properties%5B%22%24email%22%5D%20%3D%3D%20%22testing%22',
            },
            {
              name: 'array',
              value: 'something%26nothing%3Dtrue&array=nothing%26something%3Dfalse&array=another%20item',
            },
          ],
          bodySize: -1,
          headersSize: 0,
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
              args: {
                array: ['something&nothing=true', 'nothing&something=false', 'another item'],
                stringArray: 'where[4]=10',
                stringHash: 'hash#data',
                stringPound: 'something&nothing=true',
                stringWeird: 'properties["$email"] == "testing"',
              },
              data: '',
              files: {},
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                Host: 'httpbin.org',
                'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
              },
              json: null,
              method: 'GET',
              origin: '127.0.0.1',
              url: 'https://httpbin.org/anything?stringPound=something%26nothing%3Dtrue&stringHash=hash%23data&stringArray=where[4]%3D10&stringWeird=properties["%24email"] %3D%3D "testing"&array=something%26nothing%3Dtrue&array=nothing%26something%3Dfalse&array=another item',
            }),
          },
          headersSize: -1,
          bodySize: -1,
        },
      },
    ],
  },
};
