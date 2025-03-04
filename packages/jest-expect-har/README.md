# jest-expect-har

A [Jest](https://jestjs.io/) custom matcher for asserting valid [HAR](<https://en.wikipedia.org/wiki/HAR_(file_format)>) definitions. Also supports [Vitest](https://vitest.dev/).

[![npm](https://img.shields.io/npm/v/jest-expect-har)](https://npm.im/jest-expect-har) [![Build](https://github.com/readmeio/jest-expect-har/workflows/CI/badge.svg)](https://github.com/readmeio/jest-expect-har)

<a href="https://readme.com">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
  <img alt="ReadMe Open Source" src="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
</picture>
</a>

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

The usage is nearly identical in Vitest:

```js
import toBeAValidHAR from 'jest-expect-har';
import { expect, test } from 'vitest';

expect.extend({ toBeAValidHAR });

test('should be a valid HAR', () => {
  expect(har).toBeAValidHAR();
});

test('should not be a valid HAR', () => {
  expect(invalidHar).not.toBeAValidHAR();
});
```
