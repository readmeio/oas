# jest-expect-har

A [Jest](https://jestjs.io/) custom matcher for asserting valid [HAR](https://en.wikipedia.org/wiki/HAR_(file_format)) definitions.

[![npm](https://img.shields.io/npm/v/jest-expect-har)](https://npm.im/jest-expect-har) [![Build](https://github.com/readmeio/jest-expect-har/workflows/CI/badge.svg)](https://github.com/readmeio/jest-expect-har)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)


## Installation

```sh
npm install --save-dev jest-expect-har
```

Once the package is installed you'll need to let Jest know about it by adding the following into your Jest config (either `jest.config.js` or under `jest` in `package.json`):

```json
"setupFilesAfterEnv": ["jest-expect-har"],
```

## Usage

```js
await expect(har).toBeAValidHAR();
```
