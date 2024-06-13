<p align="center">
  <a href="https://npm.im/postman-types">
    <img src="https://user-images.githubusercontent.com/33762/200434622-23946869-1965-46f8-8deb-f284b8d0b92c.png" alt="postman-types" />
  </a>
</p>

<p align="center">
  Types for Postman colletions
</p>

<p align="center">
  <a href="https://npm.im/postman-types"><img src="https://img.shields.io/npm/v/postman-types?style=for-the-badge" alt="NPM Version"></a>
  <a href="https://npm.im/postman-types"><img src="https://img.shields.io/node/v/postman-types?style=for-the-badge" alt="Node Version"></a>
  <a href="https://npm.im/postman-types"><img src="https://img.shields.io/npm/l/postman-types?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/readmeio/oas/tree/main/packages/postman-types"><img src="https://img.shields.io/github/actions/workflow/status/readmeio/oas/ci.yml?branch=main&style=for-the-badge" alt="Build status"></a>
</p>

<p align="center">
  <a href="https://readme.com"><img src="https://raw.githubusercontent.com/readmeio/.github/main/oss-badge.svg" /></a>
</p>

## Installation

```bash
npm install postman-types
```

## Usage

```ts
import { PostmanV2, PostmanV2_1 } from 'postman-types';

function processV2(collection: PostmanV2.Document) {}

function processV2_1(collection: PostmanV2_1.Document) {}
```
