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

- [Installation](#installation)
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
  const api = await validate(petstore);
  console.log('API name: %s, Version: %s', api.info.title, api.info.version);
} catch (err) {
  console.error(err);
}
```

### `validate()`

Validates the API definition against the [Swagger 2.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v2.0), [OpenAPI 3.0](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.0), or [OpenAPI 3.1](https://github.com/OAI/OpenAPI-Specification/tree/main/schemas/v3.1) specifications.

In addition to validating the API definition against their respective specification schemas, it will also be validated against specific areas that aren't covered by the Swagger or OpenAPI schemas, such as duplicate parameters, invalid component schema names, or duplicate `operationId` values.

If validation fails an error will be thrown with information about what, and where, the error lies within the API definition.

```ts
import { validate } from '@readme/openapi-parser';

const result = await validate(petstore);
if (result.valid) {
  console.log('🍭 The API is valid!');
} else {
  console.error(result.errors);
}
```

<details>
<summary>Error output example</summary>

```
[
  {
    message: 'REQUIRED must have required property 'url'

   7 |   },
   8 |   "servers": [
>  9 |     {
     |     ^ url is missing here!
  10 |       "urll": "http://petstore.swagger.io/v2"
  11 |     }
  12 |   ],'
  }
]
```

</details>

#### Human-readable errors

By default, `validate` returns a `ValidationResult` which will contain an array of errors. If you would like to convert this shape into a human-readable error string, you can do so by utilizing our `compileErrors` utility:

```ts
import { validate, compileErrors } from '@readme/openapi-parser';

const result = await validate(petstore);
if (result.valid) {
  console.log('🍭 The API is valid!');
} else {
  console.error(compileErrors(result));
}
```

```
OpenAPI schema validation failed.

REQUIRED must have required property 'url'

   7 |   },
   8 |   "servers": [
>  9 |     {
     |     ^ url is missing here!
  10 |       "urll": "http://petstore.swagger.io/v2"
  11 |     }
  12 |   ], */
```

`compileErrors` can also be used to turn validation warnings into a human-readable string.

#### Warnings

This library supports downgrading certain specification-level checks, that would be normally classified as a validation error, to a general warning. To configure these you do so by supplying the `validate()` call your config:

```ts
import { validate, compileErrors } from '@readme/openapi-parser';

const result = await validate(petstore, {
  validate: {
    rules: {
      openapi: {
        'path-parameters-not-in-path': 'warning',
      },
      swagger: {
        'path-parameters-not-in-path': 'warning',
      },
    },
  },
});

if (result.valid) {
  if (result.warnings.length) {
    console.warn('🚸 The API is valid but has some warnings.');
    console.warn(result.warnings);
  } else {
    console.log('🍭 The API is valid!');
  }
} else {
  console.error(compileErrors(result));
}
```

The following OpenAPI and Swagger rules can be downgraded to warnings. By default, they are all treated as errors.

<!-- prettier-ignore-start -->
| Rule | Description | Supports OpenAPI? | Supports Swagger? |
| :--- | :--- | :--- | :--- |
| `array-without-items` | Schemas that are defined as `type: array` must also have an `items` schema. | ✓ | ✓ |
| `duplicate-non-request-body-parameters` | Parameters must be unique. | ✓ | ✓ |
| `duplicate-operation-id` | The `operationId` definition in a path object must be unique. | ✓ | ✓ |
| `non-optional-path-parameters` | Parameters that are defined within the path URI must be specified as being `required`. | ✓ | ✓ |
| `path-parameters-not-in-parameters` | Path parameters defined in a path URI path template must also be specified as part of that paths `parameters`. | ✓ | ✓ |
| `path-parameters-not-in-path` | Path parameters defined in `parameters` must also be specified in the path URI with path templating. | ✓ | ✓ |
| `unknown-required-schema-property` | Schema properties that are listed as being required but don't exist within the schema. | ✕ | ✓ |
<!-- prettier-ignore-end -->

#### Colorizing errors

This library supports colorizing errors with the [picocolors](https://npm.im/picocolors) library. To enable it, supply the `validation.errors.colorize` option. The default behavior is `false`.

```ts
const result = await validate(petstore, {
  validate: {
    errors: {
      colorize: true,
    },
  },
});
```

<img src="https://user-images.githubusercontent.com/33762/137796648-7e1157c2-cee4-466e-9129-dd2a743dd163.png" width="600" />

### `.dereference()`

Dereferences all `$ref` pointers in the supplied API definition, replacing each reference with its resolved value. This results in an API definition that does not contain _any_ `$ref` pointers. Instead, it's a normal JSON object tree that can easily be crawled and used just like any other object. This is great for programmatic usage, especially when using tools that don't understand JSON references.

```ts
import { dereference } from '@readme/openapi-parser';

const api = await dereference(petstore);

// The `api` object is a normal JSON object so you can access any part of the
// API definition using object notation.
console.log(api.components.schemas.pet.properties.name); // => { type: "string" }
```

### `.bundle()`

Bundles all referenced files and URLs into a single API definition that only has _internal_ `$ref` pointers. This lets you split up your definition however you want while you're building it, but later combine all those files together when it's time to package or distribute the API definition to other people. The resulting definition size will be small, since it will still contain _internal_ JSON references rather than being fully-dereferenced.

```ts
import { bundle } from '@readme/openapi-parser';

const api = await bundle(myAPI);

console.log(api.components.schemas.pet); // => { $ref: "#/components/schemas~1pet.yaml" }
```

### `.parse()`

Parses the given API definition, in JSON or YAML format, and returns it as a JSON object. This method **does not** resolve `$ref` pointers or dereference anything. It simply parses _one_ file and returns it.

```ts
import { parse } from '@readme/openapi-parser';

const api = await parse(myAPI);

console.log('API name: %s, Version: %s', api.info.title, api.info.version);
```
