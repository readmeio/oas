<p align="center">
  <a href="https://npm.im/@readme/openapi-parser">
    <img src="https://raw.githubusercontent.com/readmeio/oas/main/.github/tooling-hero.png" alt="@readme/openapi-parser" />
  </a>
</p>

<p align="center">
  A Swagger 2.0 and OpenAPI 3.x validation and parsing engine
</p>

<p align="center">
  <a href="https://npm.im/@readme/openapi-parser"><img src="https://img.shields.io/npm/v/@readme/openapi-parser?style=for-the-badge" alt="NPM Version"></a>
  <a href="https://npm.im/@readme/openapi-parser"><img src="https://img.shields.io/node/v/@readme/openapi-parser?style=for-the-badge" alt="Node Version"></a>
  <a href="https://npm.im/@readme/openapi-parser"><img src="https://img.shields.io/npm/l/@readme/openapi-parser?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/readmeio/oas/tree/main/packages/parser"><img src="https://img.shields.io/github/actions/workflow/status/readmeio/oas/ci.yml?branch=main&style=for-the-badge" alt="Build status"></a>
</p>

<p align="center">
  <a href="https://readme.com"><img src="https://raw.githubusercontent.com/readmeio/.github/main/oss-badge.svg" /></a>
</p>

`@readme/openapi-parser` is a library to validate and parse [OpenAPI](https://openapis.org) and Swagger API definitions. It is a hard fork of [@apidevtools/swagger-parser](https://npm.im/@apidevtools/swagger-parser) and offers support for improved validation error messages as well as error leveling.

---

- [Installation](https://api.readme.dev/docs/installation)
- [Features](#features)
- [Usage](#usage)
  - [validate()](#validate)
  - [dereference()](#dereference)
  - [bundle()](#bundle)
  - [parse()](#parse)
  - [Error Handling](#error-handling)

## Installation

```
npm install @readme/openapi-parser
```

## Features

- Parses API definitions in either JSON or YAML formats.
- Validates against the [Swagger 2.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v2.0), [OpenAPI 3.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.0), or [OpenAPI 3.1](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.1) specifications.
- Resolves all `$ref` pointers, including external files and URLs.
- Can bundle all of your referenced API definitions into a single file that only has _internal_ `$ref` pointers.
- Can dereference all `$ref` pointers, giving you a normal JSON object that's easy to work with.
- Works in all modern browsers!

## Usage

```ts
import { validate } from '@readme/openapi-parser';

try {
  const api = await validate(myAPI);
  console.log('API name: %s, Version: %s', api.info.title, api.info.version);
} catch (err) {
  console.error(err);
}
```

### `validate()`

Validates the API definition against the [Swagger 2.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v2.0), [OpenAPI 3.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.0), or [OpenAPI 3.1](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.1) specifications.

In addition to validating the API definition against their respective specification schemas it will also be validated against specific areas that aren't covered by the Swagger or OpenAPI schemas, such as duplicate parameters, invalid component schema names, or duplicate `operationId` values.

If validation fails an error will be thrown with information about what, and where, the error lies within the API defintiion.

Internally this method invokes [`dereference()`](#dereference) so the returned object, whether its a Swagger or OpenAPI definition, will be fully dereferenced.

```ts
import { validate } from '@readme/openapi-parser';

try {
  const api = await validate(myAPI);
  console.log('🍭 The API is valid!');
} catch (err) {
  console.error(err);
}
```

### `.dereference()`

Dereferences all `$ref` pointers in the supplied API definition, replacing each reference with its resolved value. This results in an API definition that does not contain _any_ `$ref` pointers. Instead, it's a normal JSON object tree that can easily be crawled and used just like any other object. This is great for programmatic usage, especially when using tools that don't understand JSON references.

```ts
import { dereference } from '@readme/openapi-parser';

const api = await dereference(myAPI);

// The `api` object is a normal JSON object so you can access any part of the
// API definition using object notation.
console.log(api.definitions.person.properties.firstName); // => { type: "string" }
```

### `.bundle()`

Bundles all referenced files and URLs into a single API definition that only has _internal_ `$ref` pointers. This lets you split up your definition however you want while you're building it, but later combine all those files together when it's time to package or distribute the API definition to other people. The resulting defintiion size will be small, since it will still contain _internal_ JSON references rather than being fully-dereferenced.

```ts
import { bundle } from '@readme/openapi-parser';

const api = await bundle(myAPI);

console.log(api.definitions.person); // => { $ref: "#/definitions/schemas~1person.yaml" }
```

### `.parse()`

Parses the given API definition, in JSON or YAML format, and returns it as a JSON object. This method **does not** resolve `$ref` pointers or dereference anything. It simply parses _one_ file and returns it.

```ts
import { parse } from '@readme/openapi-parser';

const api = await parse(myAPI);

console.log('API name: %s, Version: %s', api.info.title, api.info.version);
```

### Error Handling

To reduce the amount of potentially unnecessary noise that JSON pointer errors coming out of [Ajv](https://ajv.js.org/), which `@readme/openapi-parser` uses under the hood, we utilize utilizes [better-ajv-errors](https://npm.im/@readme/better-ajv-errors), along with some intelligent reduction logic, to only surface the errors that _actually_ matter.

<img src="https://user-images.githubusercontent.com/33762/137796648-7e1157c2-cee4-466e-9129-dd2a743dd163.png" width="600" />

Additionally with these error reporting differences, this library ships with a `validation.colorizeErrors` option that will disable colorization within these prettified errors.
