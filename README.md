# jest-expect-har

A [Jest](https://jestjs.io/) custom matcher for asserting valid [HAR](https://en.wikipedia.org/wiki/HAR_(file_format)) definitions.

[![npm](https://img.shields.io/npm/v/jest-expect-har)](https://npm.im/jest-expect-har) [![Build](https://github.com/readmeio/jest-expect-har/workflows/CI/badge.svg)](https://github.com/readmeio/jest-expect-har)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)


## Installation

```sh
npm install jest-expect-har --save-dev
```

## Usage

```js
import toBeAValidHAR from 'jest-expect-har';

expect.extend({ toBeAValidHAR });

test('should be a valid HAR', () => {
  expect(har).toBeAValidHAR();
});

test('should not be a valid HAR', () => {
  expect(invalidHar).not.toBeAValidHAR();
});
```
