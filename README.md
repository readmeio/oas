# jest-expect-openapi

A [Jest](https://jestjs.io/) custom matcher for asserting valid [OpenAPI](https://en.wikipedia.org/wiki/OpenAPI_Specification) definitions. Also supports [Vitest](https://vitest.dev/).

[![npm](https://img.shields.io/npm/v/jest-expect-openapi)](https://npm.im/jest-expect-openapi) [![Build](https://github.com/readmeio/jest-expect-openapi/workflows/CI/badge.svg)](https://github.com/readmeio/jest-expect-openapi)

<a href="https://readme.com">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
  <img alt="ReadMe Open Source" src="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
</picture>
</a>

## Installation

```sh
npm install jest-expect-openapi --save-dev
```

## Usage

```js
import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';

expect.extend({ toBeAValidOpenAPIDefinition });

test('should be a valid OpenAPI', () => {
  expect(oas).toBeAValidOpenAPIDefinition();
});

test('should not be a valid OpenAPI', () => {
  expect(invalidOas).not.toBeAValidOpenAPIDefinition();
});
```

The usage is nearly identical in Vitest:

```js
import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { expect, test } from 'vitest';

expect.extend({ toBeAValidOpenAPIDefinition });

test('should be a valid OpenAPI', () => {
  expect(oas).toBeAValidOpenAPIDefinition();
});

test('should not be a valid OpenAPI', () => {
  expect(invalidOas).not.toBeAValidOpenAPIDefinition();
});
```
