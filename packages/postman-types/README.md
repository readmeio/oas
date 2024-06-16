# postman-types

Types for [Postman collections](https://www.postman.com/collection/).

[![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/tree/main/packages/postman-types) [![](https://img.shields.io/npm/v/postman-types)](https://npm.im/postman-types)

[![](https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png)](https://readme.com)

## Installation

```bash
npm install postman-types
```

## Usage

```ts
import { Postman, PostmanV2, PostmanV2_1 } from 'postman-types';

function process(collection: Postman.Collection) {}

function processV2(collection: PostmanV2.Collection) {}

function processV2_1(collection: PostmanV2_1.Collection) {}
```
