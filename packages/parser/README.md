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
  - [Methods](#methods)
    - [.validate()](#validate)
    - [.dereference()](#dereference)
    - [.bundle()](#bundle)
    - [.parse()](#parse)
    - [.resolve()](#resolve)
  - [Error Handling](#error-handling)
- [FAQ](#faq)

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
import { OpenAPIParser } from '@readme/openapi-parser';

try {
  const api = await OpenAPIParser.validate(myAPI);
  console.log('API name: %s, Version: %s', api.info.title, api.info.version);
} catch (err) {
  console.error(err);
}
```

### Methods

#### `.validate()`

Validates the API definition against the [Swagger 2.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v2.0), [OpenAPI 3.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.0), or [OpenAPI 3.1](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.1) specifications.

If the `validate.spec` option is enabled (it is enabled by default), then this the API definition will also be validated against specific areas that aren't covered by the Swagger or OpenAPI schemas, such as duplicate parameters, invalid component schema names, or duplicate `operationId` values.

If validation fails an error will be thrown with information about what, and where, the error lies within the API defintiion.

Internally this method invokes [`.dereference()`](#dereference) so the returned object, whether its a Swagger or OpenAPI definition, will be fully dereferenced.

```ts
try {
  const api = await OpenAPIParser.validate(myAPI);
  console.log('🍭 The API is valid!');
} catch (err) {
  console.error(err);
}
```

#### `.dereference()`

Dereferences all `$ref` pointers in the supplied API definition, replacing each reference with its resolved value. This results in an API definition that does not contain _any_ `$ref` pointers. Instead, it's a normal JSON object tree that can easily be crawled and used just like any other object. This is great for programmatic usage, especially when using tools that don't understand JSON references.

```ts
const api = await OpenAPIParser.dereference(myAPI);

// The `api` object is a normal JSON object so you can access any part of the
// API definition using object notation.
console.log(api.definitions.person.properties.firstName); // => { type: "string" }
```

#### `.bundle()`

Bundles all referenced files and URLs into a single API definition that only has _internal_ `$ref` pointers. This lets you split up your definition however you want while you're building it, but later combine all those files together when it's time to package or distribute the API definition to other people. The resulting defintiion size will be small, since it will still contain _internal_ JSON references rather than being fully-dereferenced.

```ts
const api = await OpenAPIParser.bundle(myAPI);

console.log(api.definitions.person); // => { $ref: "#/definitions/schemas~1person.yaml" }
```

#### `.parse()`

Parses the given API definition, in JSON or YAML format, and returns it as a JSON object. This method **does not** resolve `$ref` pointers or dereference anything. It simply parses _one_ file and returns it.

```ts
const api = await OpenAPIParser.parse(myAPI);

console.log('API name: %s, Version: %s', api.info.title, api.info.version);
```

#### `.resolve()`

> [!NOTE]
> This method is used internally by other methods, such as [`.bundle()`](#bundle) and [`.dereference()`](#dereference). You probably won't need to call this method yourself.

Resolves all JSON references (`$ref` pointers) in the given API definition. If it references any other files or URLs then they will be downloaded and resolved as well (unless `options.$refs.external` is false). This method **does not** dereference anything. It simply gives you a `$Refs` object, which is helper class containing a map of all the resolved references and their values.

```ts
const $refs = await OpenAPIParser.resolve(myAPI);

// `$refs.paths()` returns the paths of all the files in your API.
const filePaths = $refs.paths();

// `$refs.get()` lets you query parts of your API.
const name = $refs.get('schemas/person.yaml#/properties/name');

// `$refs.set()` lets you change parts of your API.
$refs.set('schemas/person.yaml#/properties/favoriteColor/default', 'blue');
```

### Error Handling

To reduce the amount of potentially unnecessary noise that JSON pointer errors coming out of [Ajv](https://ajv.js.org/), which `@readme/openapi-parser` uses under the hood, we utilize utilizes [better-ajv-errors](https://npm.im/@readme/better-ajv-errors), along with some intelligent reduction logic, to only surface the errors that _actually_ matter.

<img src="https://user-images.githubusercontent.com/33762/137796648-7e1157c2-cee4-466e-9129-dd2a743dd163.png" width="600" />

Additionally with these error reporting differences, this library ships with a `validation.colorizeErrors` option that will disable colorization within these prettified errors.
