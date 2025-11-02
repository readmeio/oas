# @readme/http-headers

Utility to find descriptions for HTTP headers.

[![npm](https://img.shields.io/npm/v/@readme/http-headers)](https://npm.im/@readme/http-headers) [![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/tree/main/packages/http-headers)

<a href="https://readme.com">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
  <img alt="ReadMe Open Source" src="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
</picture>
</a>

## Installation

```sh
npm install --save @readme/http-headers
```

## Usage

This library retrieves header descriptions directly from [MDN's header documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers).

```ts
import { getHeader } from '@readme/http-headers';

// A typical header
console.log(getHeader('Connection'));
/**
{
  description: 'Controls whether the network connection stays open after the current transaction finishes.',
  link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Connection',
}
*/

// A header with a Markdown-flavored description
console.log(getHeader('Cookie'));
/**
{
  description: 'Contains stored HTTP cookies previously sent by the server with the Set-Cookie header.',
  link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie',
  markdown: 'Contains stored [HTTP cookies](/en-US/docs/Web/HTTP/Cookies) previously sent by the server with the "Set-Cookie" header',
}
*/

// A header with additional decorations
console.log(getHeader('DPR'));
/**
{
  deprecated: true,
  experimental: true,
  description: 'Client device pixel ratio (DPR), which is the number of physical device pixels corresponding to every CSS pixel.',
  link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DPR',
}
*/
```
