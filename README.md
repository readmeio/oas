# @readme/http-status-codes

Utility to lookup HTTP status codes.

[![Build](https://github.com/readmeio/http-status-codes/workflows/CI/badge.svg)](https://github.com/readmeio/http-status-codes)

[![](https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png)](https://readme.io)

## Installation

```sh
npm install --save @readme/http-status-codes
```

## Usage

```js
import { getStatusCode } from '@readme/http-status-codes';

console.log(getStatusCode(429));

// { code: 429, message: 'Too Many Requests', success: false }
```
