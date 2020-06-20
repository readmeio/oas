# @readme/http-status-codes

Utility to lookup HTTP status codes.

[![Build](https://github.com/readmeio/http-status-codes/workflows/CI/badge.svg)](https://github.com/readmeio/http-status-codes)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)

## Installation

```sh
npm install --save @readme/http-status-codes
```

## Usage

```js
const { getStatusCode } = require('@readme/http-status-codes');
console.log(getStatusCode(429));

// { code: 429, message: 'Too Many Requests', success: false }
```

## Credits
[Jon Ursenbach](https://github.com/erunion)

## License

MIT
