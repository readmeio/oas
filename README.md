# oas

Working with Swagger and OpenAPI definitions is hard. This makes it easier.

[![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/) [![](https://img.shields.io/npm/v/oas)](https://npm.im/oas)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.com)

## Installation

```
npm install oas
```

## CLI
The CLI tool makes creating API definition files easier. It currently supports [Swagger 2](https://swagger.io/specification/v2/) and [OpenAPI 3.x](https://swagger.io/specification/) documents.

### Usage

Go to a directory with your API, and type:

```
oas init
```

It will walk you through how to document your API with a OpenAPI 3.0 Spec.

### Swagger Inline

`oas` uses [swagger-inline](https://github.com/readmeio/swagger-inline) which allows you include a little OpenAPI snippet in a comment above your code, and collects them all together into one OpenAPI file:

```js
/*
 * @oas [get] /pet/{petId}
 * description: "Returns all pets from the system that the user has access to"
 * parameters:
 *   - (path) petId=hi* {String} The pet ID
 *   - (query) limit {Integer:int32} The number of resources to return
*/
route.get("/pet/:petId", pet.show);
```

You need to start with `@oas [method] path`, but everything below it is a valid [Path Definition](http://swagger.io/specification/#pathItemObject).

You can also do **inline parameters**, which are shorthand for parameters. They aren't valid OpenAPI properties but `swagger-inline` knows how to compile them:

```
- (in) name=default* {type:format} Description
```

### Host your API definition

Hosting API documentation is hard so, we have an online component that hosts your OpenAPI/Swagger file for you. Just type the following to get a URL:

```
oas host
```

This will upload your API definition and give you a public URL you can use.

## Tooling
This library also exposes a set of tooling to help you manage OpenAPI definitions. You can access it by loading:

```js
require('oas/tooling')
```

> To use a compiled version of this offering within a browser, you can load `oas/.tooling`

Components available are the following:

* `oas/tooling`: An OAS class can help you discover operations within a large OpenAPI file.
* `oas/tooling/operation`: An Operation class that can help you manage and retrieve specific data from an API operation.
* `oas/tooling/utils`
    * `findSchemaDefinition`: Function to assist with `$ref` lookups.
    * `flattenSchema`: Function to reduce a schema definition into a singular list.
    * `getSchema`: Retrieve the first `requestBody` schema on an operation.
    * `parametersToJsonSchema`: Warehouse method to reduce an operation down into a JSON Schema-compatible representation.
