# @readme/openapi-schemas

[![Build](https://github.com/readmeio/openapi-schemas/workflows/CI/badge.svg)](https://github.com/readmeio/openapi-schemas/) [![](https://img.shields.io/npm/v/@readme/openapi-schemas)](https://npm.im/@readme/openapi-schemas)

[![](https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png)](https://readme.io)

This package contains [**the official JSON Schemas**](https://github.com/OAI/spec.openapis.org/tree/main/oas) for every version of Swagger/OpenAPI Specification:

<!-- prettier-ignore-start -->
| Version | Schema | Docs |
| :--- | :--- | :--- |
| Swagger 1.2 | [v1.2 schema](https://github.com/OAI/OpenAPI-Specification/tree/main/_archive_/schemas/v1.2) | [v1.2 docs](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/1.2.md) |
| Swagger 2.0 | [v2.0 schema](https://github.com/OAI/spec.openapis.org/tree/main/oas/2.0/schema) | [v2.0 docs](https://spec.openapis.org/oas/v2.0.html) |
| OpenAPI 3.0.x | [v3.0.x schema](https://github.com/OAI/spec.openapis.org/tree/main/oas/3.0/schema) | [v3.0.x docs](https://spec.openapis.org/oas/v3.0.4.html) |
| OpenAPI 3.1.x | [v3.1.x schema](https://github.com/OAI/spec.openapis.org/tree/main/oas/3.1/schema) | [v3.1.x docs](https://spec.openapis.org/oas/v3.1.2.html) |
| OpenAPI 3.2.x | [v3.2.x schema](https://github.com/OAI/spec.openapis.org/tree/main/oas/3.2/schema) | [v3.2.x docs](https://spec.openapis.org/oas/v3.2.0.html) |
<!-- prettier-ignore-end -->

## Installation

You can install OpenAPI Schemas via [npm](https://docs.npmjs.com/about-npm/).

```bash
npm install @readme/openapi-schemas
```

## Usage

The library contains all OpenAPI Specification versions:

```js
import { openapi } from '@readme/openapi-schemas';

console.log(openapi.v1); // { $schema, id, properties, definitions, ... }
console.log(openapi.v2); // { $schema, id, properties, definitions, ... }
console.log(openapi.v3); // { $schema, id, properties, definitions, ... }
console.log(openapi.v31); // { $schema, id, properties, definitions, ... }
console.log(openapi.v32); // { $schema, id, properties, definitions, ... }
```

You can use a JSON Schema validator such as [Z-Schema](https://npm.im/z-schema) or [AJV](https://npm.im/ajv) to validate OpenAPI definitions against the specification.

```js
import { openapi } from '@readme/openapi-schemas';
import ZSchema from 'z-schema';

// Create a ZSchema validator
let validator = new ZSchema();

// Validate an OpenAPI definition against the OpenAPI v3.0 specification
validator.validate(openapiDefinition, openapi.v31);
```
