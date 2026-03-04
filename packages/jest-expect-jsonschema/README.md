# jest-expect-jsonschema

A [Vitest](https://vitest.dev/) and [Jest](https://jestjs.io/) custom matcher for asserting valid [JSON Schema](https://json-schema.org/) objects.

[![npm](https://img.shields.io/npm/v/jest-expect-jsonschema)](https://npm.im/jest-expect-jsonschema) [![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/tree/main/packages/jest-expect-jsonschema)

<a href="https://readme.com">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
  <img alt="ReadMe Open Source" src="https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png">
</picture>
</a>

## Installation

```sh
npm install jest-expect-jsonschema --save-dev
```

## Usage

```ts
import { toBeValidJSONSchema } from 'jest-expect-jsonschema';
import { expect, test } from 'vitest';

expect.extend({ toBeValidJSONSchema });

test('should be valid JSON Schema', async () => {
  await expect({
    type: 'string',
  }).toBeValidJSONSchema();
});

test('should not be valid JSON Schema', () => {
  await expect({
    type: 'invalid-type',
  }).not.toBeValidJSONSchema();
});
```

The usage is nearly identical in Jest:

```ts
import { toBeValidJSONSchema } from 'jest-expect-jsonschema';

expect.extend({ toBeValidJSONSchema });

test('should be valid JSON Schema', () => {
  await expect({
    type: 'string',
  }).toBeValidJSONSchema();
});

test('should not valid JSON Schema', async () => {
  await expect({
    type: 'invalid-type',
  }).not.toBeValidJSONSchema();
});
```
