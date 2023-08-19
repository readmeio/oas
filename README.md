# @readme/http-headers

Utility to find descriptions for HTTP headers.

[![Build](https://github.com/readmeio/http-headers/workflows/CI/badge.svg)](https://github.com/readmeio/http-headers)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)

## Installation

```sh
npm install --save @readme/http-headers
```

## Usage

`HTTP-Headers` pulls header descriptions directly from [MDN's header documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers).

```js
import getHeader from '@readme/http-headers';

//  A typical header
console.log(getHeader('Connection'));
/**
{
    description: 'Controls whether the network connection stays open after the current transaction finishes.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Connection',
}
**/

// A header with a markdown-flavored description
console.log(getHeader('Cookie'));
/**
{
    description: 'Contains stored HTTP cookies previously sent by the server with the Set-Cookie header.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie',
    markdown:
      'Contains stored [HTTP cookies](/en-US/docs/Web/HTTP/Cookies) previously sent by the server with the "Set-Cookie" header',
}
**/

// A header with additional decorations
console.log(getHeader('DPR'));
/**
{
    deprecated: true,
    experimental: true,
    description:
      'Client device pixel ratio (DPR), which is the number of physical device pixels corresponding to every CSS pixel.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DPR',
}
**/
```
