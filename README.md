# har-examples
[![CI](https://github.com/readmeio/har-examples/workflows/CI/badge.svg)](https://github.com/readmeio/har-examples)

A collection of HAR files for developing against the [HAR spec](http://www.softwareishard.com/blog/har-12-spec/).

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
        "request": {
          "method": "GET",
          "url": "http://mockbin.com/har",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [],
          "queryString": [],
          "bodySize": 0,
          "headersSize": 0
        }
      }
    ]
  }
} */
```
