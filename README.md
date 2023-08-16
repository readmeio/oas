# @readme/http-headers

Utility to find descriptions for HTTP headers.

[![Build](https://github.com/readmeio/http-headers/workflows/CI/badge.svg)](https://github.com/readmeio/http-headers)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)

## Installation

```sh
npm install --save @readme/http-headers
```

## Usage

`HTTP-Headers` pulls header descriptions directly from MDN, via a `fetch` request. It then stores response markdown in memory for future usage. That means that the library is inherently asynchronous, and will need to be used with a promise handler.

```js
import getHeaderDescription from '@readme/http-headers';

console.log(await getHeaderDescription('Connection'));
/**
{
    Connection:  'Controls whether the network connection stays open after the current transaction finishes.',
}
**/

console.log(await getHeaderDescription(['Authorization', 'Content-Length']));
/**
{
    Authorization:  'Contains the credentials to authenticate a user-agent with a server.',
    'Content-Length': 'The size of the resource, in decimal number of bytes.',
}
**/
```
