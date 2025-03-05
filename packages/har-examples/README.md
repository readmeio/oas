# har-examples

A collection of HAR files for developing against the [HAR specification](http://www.softwareishard.com/blog/har-12-spec/).

[![npm](https://img.shields.io/npm/v/har-examples)](https://npm.im/har-examples) [![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/tree/main/packages/har-examples)

<a href="https://readme.com">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
  <img alt="ReadMe Open Source" src="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
</picture>
</a>

## Installation

```
npm install --save-dev har-examples
```

## Usage

```ts
const hars from 'har-examples';

console.log(hars['short']);
```

```js
{
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
}
```
