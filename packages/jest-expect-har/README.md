# jest-expect-har

A [Vitest](https://vitest.dev/) and [Jest](https://jestjs.io/) custom matcher for asserting valid [HAR](<https://en.wikipedia.org/wiki/HAR_(file_format)>) definitions.

[![npm](https://img.shields.io/npm/v/jest-expect-har)](https://npm.im/jest-expect-har) [![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/tree/main/packages/jest-expect-har)

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

```ts
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

The usage is nearly identical in Jest:

```ts
import toBeAValidHAR from 'jest-expect-har';

expect.extend({ toBeAValidHAR });

test('should be a valid HAR', () => {
  expect(har).toBeAValidHAR();
});

test('should not be a valid HAR', () => {
  expect(invalidHar).not.toBeAValidHAR();
});
```
