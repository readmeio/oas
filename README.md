# oas

Working with OpenAPI definitions is hard. This makes it easier.

[![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/) [![](https://img.shields.io/npm/v/oas)](https://npm.im/oas)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.com)

## Installation

```
npm install oas
```

## CLI
The CLI tool makes creating API definition files easier. It currently supports [OpenAPI 3.x](https://swagger.io/specification/) and [Swagger 2.0](https://swagger.io/specification/v2/) documents.

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

## Tooling
This library also exposes a set of tooling to help you manage OpenAPI definitions. You can access it by loading:

```js
import Oas from 'oas';
// or: const Oas = require('oas').default;
```

Also exposed within the main `oas` export is an `Operation` class that can help you manage and retrieve specific data from an API operation.

> If you need to use this library within a browser you'll likely need to use a bundler like [Webpack](https://webpack.js.org/) or [Rollup](https://rollupjs.org/).
