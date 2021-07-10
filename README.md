# har-examples
[![CI](https://github.com/readmeio/har-examples/workflows/CI/badge.svg)](https://github.com/readmeio/har-examples)

A collection of HAR files for developing against the [HAR specification](http://www.softwareishard.com/blog/har-12-spec/).

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)

## Installation

```
npm install --save-dev har-examples
```

## Usage
```js
const hars = require('har-examples');

console.log(hars['short']);

/* {
  "log": {
    "entries": [
      {
        "startedDateTime": "2021-07-09T23:28:52.627Z",
        "time": 85,
        "request": {
          "method": "GET",
          "url": "https://httpbin.org/get",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [],
          "queryString": [],
          "bodySize": -1,
          "headersSize": -1
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "httpVersion": "HTTP/1.1",
          "headers": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Content-Length",
              "value": 404
            }
          ],
          "content": {
            "size": 404,
            "mimeType": "application/json",
            "text": "{\"args\":{},\"headers\":{\"Accept\":\"*\/*\",\"Accept-Encoding\":\"gzip, deflate, br\",\"Cache-Control\":\"no-cache\",\"Host\":\"httpbin.org\"},\"origin\":\"127.0.0.1\",\"url\":\"https://httpbin.org/get\"}"
          },
          "headersSize": -1,
          "bodySize": -1
        }
      }
    ]
  }
} */
```
