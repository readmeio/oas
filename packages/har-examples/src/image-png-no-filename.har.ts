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
              value: 'image/png',
            },
          ],
          queryString: [],
          postData: {
            mimeType: 'image/png',
            text: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACNUlEQVR4AWJkIA2wCQHqJgcouZ0ADv+SmayR28PibPOP2jafzdp6Lh/v2bVt2+1zbdvtbtbMpGfmvmD8jStc9uB3v75gdNmqtJqsa6qCDEBPRVH7XpKk1P9yHLZv3mG6keV9BIsWGqNuvNaiy+YoARFIXFXwf6Frjz/X9oS4LNRkty4QH/0MSnnWDHORHV3pJsiozRk0zWW/9MEi0A9ffqOhf5RRDW6SGLT/ZXcT8C1hWvao8iF1c4ecKx5eejW1bii1y1asW14P5XsUNkogmvVQg2aPLOnrqss9qE81OYlAucRrN/LrqlBSWYufv34jq7gKseA7MCr0IOhffForGsTWDBJnqE2/B0H+hKRRG3DtxEGk6QBZQ9UFClMSnTJe/cCVI5uQJJpx+8AyOBUPPv+JIpJjgJqCZzKT0AGdAgT/1OLtSzsKI2/gspnxvGExZYFADcoSsqM10SADF4jC4TCCUDN8nih+eoIgPAdGeajBNxyMH20JwsPNMwSicUjBCAwmAZ6GkCmA7I+qCxTGRHSkVzZiCRmKAsRkuVmWiENrt6gL5Di7iw4oogFSINIkCTU09hNAP64CREPUBbzAx9ABrc2I3w2NeY5DMByHu8AGY3YyeoKIuSmBWCD6OuqLPJXe/Dpvkb3FuoDbdENKuBVJ4nxZJpKgWoUXCMcYUwBwDfR8FxZPN4wfWK2Zunq7tGLmZMOc7x7ZUn/RuDmrX0H/4FffQ2teylCecuWmDNsTnainfwFPuNZTR3MemwAAAABJRU5ErkJggg==',
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
            { name: 'Content-Length', value: '854' },
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
              data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACNUlEQVR4AWJkIA2wCQHqJgcouZ0ADv+SmayR28PibPOP2jafzdp6Lh/v2bVt2+1zbdvtbtbMpGfmvmD8jStc9uB3v75gdNmqtJqsa6qCDEBPRVH7XpKk1P9yHLZv3mG6keV9BIsWGqNuvNaiy+YoARFIXFXwf6Frjz/X9oS4LNRkty4QH/0MSnnWDHORHV3pJsiozRk0zWW/9MEi0A9ffqOhf5RRDW6SGLT/ZXcT8C1hWvao8iF1c4ecKx5eejW1bii1y1asW14P5XsUNkogmvVQg2aPLOnrqss9qE81OYlAucRrN/LrqlBSWYufv34jq7gKseA7MCr0IOhffForGsTWDBJnqE2/B0H+hKRRG3DtxEGk6QBZQ9UFClMSnTJe/cCVI5uQJJpx+8AyOBUPPv+JIpJjgJqCZzKT0AGdAgT/1OLtSzsKI2/gspnxvGExZYFADcoSsqM10SADF4jC4TCCUDN8nih+eoIgPAdGeajBNxyMH20JwsPNMwSicUjBCAwmAZ6GkCmA7I+qCxTGRHSkVzZiCRmKAsRkuVmWiENrt6gL5Di7iw4oogFSINIkCTU09hNAP64CREPUBbzAx9ABrc2I3w2NeY5DMByHu8AGY3YyeoKIuSmBWCD6OuqLPJXe/Dpvkb3FuoDbdENKuBVJ4nxZJpKgWoUXCMcYUwBwDfR8FxZPN4wfWK2Zunq7tGLmZMOc7x7ZUn/RuDmrX0H/4FffQ2teylCecuWmDNsTnainfwFPuNZTR3MemwAAAABJRU5ErkJggg==',
              files: {},
              form: {},
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Length': '854',
                'Content-Type': 'image/png',
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
