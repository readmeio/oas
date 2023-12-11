# @readme/http-status-codes

Utility to lookup HTTP status codes.

[![CI](https://github.com/readmeio/http-status-codes/actions/workflows/ci.yml/badge.svg)](https://github.com/readmeio/http-status-codes/actions/workflows/ci.yml)

<a href="https://readme.com">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
  <img alt="ReadMe Open Source" src="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
</picture>
</a>

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
