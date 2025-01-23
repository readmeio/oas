<p align="center">
  <a href="https://npm.im/oas">
    <img src="https://raw.githubusercontent.com/readmeio/oas/main/.github/hero.png" alt="oas" />
  </a>
</p>

<p align="center">
  Comprehensive tooling for working with OpenAPI definitions
</p>

<p align="center">
  <a href="https://npm.im/oas"><img src="https://img.shields.io/npm/v/oas?style=for-the-badge" alt="NPM Version" /></a>
  <a href="https://npm.im/oas"><img src="https://img.shields.io/node/v/oas?style=for-the-badge" alt="Node Version" /></a>
  <a href="https://npm.im/oas"><img src="https://img.shields.io/npm/l/oas?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://github.com/readmeio/oas"><img src="https://img.shields.io/github/actions/workflow/status/readmeio/oas/ci.yml?branch=main&style=for-the-badge" alt="Build status" /></a>
</p>

<p align="center">
  <a href="https://readme.com"><img src="https://raw.githubusercontent.com/readmeio/.github/main/oss-badge.svg" /></a>
</p>

`oas` is the library that we've built at [ReadMe](https://readme.com) for powering everything we do related to [OpenAPI](https://www.openapis.org/); from our [Reference Guides](https://readme.com/documentation), to our [Metrics product](https://readme.com/metrics), or other in-house tooling like [code generation](https://npm.im/@readme/oas-to-snippet), [request execution](https://npm.im/@readme/oas-to-har), and [SDK code generation](https://api.readme.dev/).

---

- [Installation](https://api.readme.dev/docs/installation)
- [Usage](#usage)
  - [OpenAPI definitions](#openapi-definitions)
    - [General](#general)
    - [Operations](#operations)
    - [Servers](#servers)
    - [Specification Extensions](#specification-extensions)
    - [User Authentication](#user-authentication)
  - [Operations](#operations-1)
    - [General](#general-1)
    - [Callbacks](#callbacks)
    - [Request Body](#request-body)
    - [Responses](#responses)
    - [Security](#security)
    - [Specification Extensions](#specification-extensions-1)
  - [Callbacks](#callbacks)
    - [General](#general-2)
  - [Webhooks](#webhooks)
- [FAQ](#faq)

## Installation

```
npm install oas
```

## Usage

> [!NOTE]
> If you need to use this library within a browser you'll likely need to use a bundler like [Webpack](https://webpack.js.org/) or [Rollup](https://rollupjs.org/).

`oas` offers a main `Oas` class, which will be your main entrypoint for using the library.

```js
import Oas from 'oas';
import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json';

const petstore = new Oas(petstoreSpec);
```

Here the `Oas` constructor takes a JSON API definition (`petstoreSpec`). All API definitions you feed it must be JSON and must be an OpenAPI definition. If you have a YAML or Swagger definition you will need to convert it (our [oas-normalize](https://npm.im/oas-normalize) library can do this for you). And if you're in a CJS or non-`import` environment you can pull the library in with `require('oas').default`.

From here, the following APIs are at your disposal.

### OpenAPI definitions

Because this library has full TypeScript types and docblocks this README is not intended to be full documentation so consult the individual method docblocks if you need more information on a specific method.

#### General

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.dereference()` | Dereference the current OpenAPI definition. Note that this will ignore circular references. |
| `.getCircularReferences()` | Retrieve an array of any circular `$ref` pointer that may exist wthin the OpenAPI definition. Note that this requires `.dereference()` to be called first. |
| `.getDefinition()` | Retrieve the OpenAPI definition that was fed into the `Oas` constructor. |
| `.getTags()` | Retrieve an array of all tags that exist within the API definition and are set on operations. |
| `.getPaths()` | Retrieve every operation that exists within the API definition. This returns an array of instances of the `Operation` class. |
| `.getVersion()` | Retrieve the OpenAPI version that this API definition is targeted for. |
| `.getWebhooks()` | Retrieve every webhook operation that exists within the API definition. This returns an array of instances of the `Webhook` class. |
| `#init()` | An alternative for `new Oas()` that you can use if the typing on the `Oas` constructor gives you trouble. Typing OpenAPI definitions is hard! |
<!-- prettier-ignore-end -->

#### Operations

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.findOperation()` | Discover an operation with the current OpenAPI definition that matches a given URL and HTTP method. |
| `.findOperationWithoutMethod()` | Like `.findOperation()` but without supplying an HTTP method. |
| `.getOperation()` | Same as `.findOperation()` but this returns an instance of the `Operation` class. |
| `.getOperationById()` | Retrieve an operation in an OpenAPI definition by an `operationId`. |
| `.operation()` | Retrieve an instance of the `Operation` or `Webhook` classes for a given path and HTTP method. |
<!-- prettier-ignore-end -->

#### Servers

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.defaultVariables()` | Retrieve the default server variables for a specific server URL, while also potentially factoring in user data. You can specify user variable data to the `Oas` constructor. Check out [Using Variables in Documentation](https://docs.readme.com/docs/user-data-options#using-variables-in-documentation) for some background on how we use this. |
| `.replaceUrl()` | Replace a given templated server URL with supplied server variable data. |
| `.splitUrl()` | Chunk out a specific server URL into its individual parts. |
| `.splitVariables` | Chunk out a given URL and if it matches a server URL in the OpenAPI file, extract the matched server variables that are present in the URL. |
| `.url()` | Retrieve a fully composed server URL. You can optionally select which of the defined server URLs to use as well as specify server variable information. |
| `.variables()` | Retrieve all server variables that a specific server URL in the definition has. |
<!-- prettier-ignore-end -->

#### Specification Extensions

> [!NOTE]
> Optionally you can also supply an instance of the `Operation` to both of these methods to see or retrieve a given extension if it exists on that operation but if it exists in both the operation and at the root the operation-level extension will be prioritized.

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getExtension()` | Retrieve a given [specification extension](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions) if it exists at the root of the API definition.  |
| `.hasExtension()` | Determine if a given [specification extension](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions) exists on the root of the API definition. |
| `.validateExtension()` | Determine if a given [ReadMe custom OpenAPI extension](https://docs.readme.com/docs/openapi-extensions) is valid or not. |
| `.validateExtensions()` | Validate all of our [ReadMe custom OpenAPI extension](https://docs.readme.com/docs/openapi-extensions), throwing exceptions when necessary. |
<!-- prettier-ignore-end -->

Information about ReadMe's supported OpenAPI extensions at https://docs.readme.com/docs/openapi-extensions.

#### User Authentication

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getAuth()` | Retrieve the appropriate API keys for the current OpenAPI definition from an object of user data. Check out [Using Variables in Documentation](https://docs.readme.com/docs/user-data-options#using-variables-in-documentation) for some background on how we use this. |
<!-- prettier-ignore-end -->

### Operations

For your convenience, the entrypoint into the `Operation` class should generally always be through `.operation()`. For example:

```js
import Oas from 'oas';
import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json';

const petstore = new Oas(petstoreSpec);
const operation = petstore.operation('/pet', 'post');
```

#### General

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getContentType()` | Retrieve the primary request body content type. If multiple are present, prefer whichever is JSON-compliant. |
| `.getDescription()` | Retrieve the `description` that's set on this operation. This supports common descriptions that may be set at the [path item level](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object). |
| `.getOperationId()` | Retrieve the `operationId` that's present on the operation, and if one is not present one will be created based off the method + path and returned instead. |
| `.hasOperationId()` | Determine if the operation has an `operationId` present. |
| `.isDeprecated()` | Determine if this operation is marked as deprecated. |
| `.isFormUrlEncoded()` | Determine if this operation requires its payload to be delivered as `application/x-www-form-urlencoded`. |
| `.isJson()` | Determine if this operation requires its payload to be delivered as JSON. |
| `.isMultipart()` | Determine if this operation requires its data to be sent as a multipart payload. |
| `.isXml()` | Determine if this operation requires its data to be sent as XML. |
| `.isWebhook()` | Determine if this operation is an instance of the `Webhook` class. |
| `.getExampleGroups()` | Returns an object with groups of all example definitions (body/header/query/path/response/etc.). The examples are grouped by their key when defined via the `examples` map. |
| `.getHeaders()` | Retrieve all headers that can either be sent for or returned from this operation. This includes header-based authentication schemes, common header parameters, and request body and response content types. |
| `.getSummary()` | Retrieve the `summary` that's set on this operation. This supports common summaries that may be set at the [path item level](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object). |
| `.getTags()` | Retrieve all tags, and [their metadata](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#tag-object), that exist on this operation. |
<!-- prettier-ignore-end -->

#### Callbacks

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getCallback()` | Retrieve a specific callback on this operation. This will return an instance of the `Callback` class. |
| `.getCallbackExamples()` | Retrieve an array of all calback examples that this operation has defined. |
| `.getCallbacks()` | Retrieve all callbacks that this operation has. Similar to `.getPaths()` returning an array of `Operation` instances this will return an array of `Callback` instances. |
| `.hasCallbacks()` | Determine if this operation has any callbacks defined. |
<!-- prettier-ignore-end -->

#### Parameters

> [!NOTE]
> All parameter accessors here support, and will automatically retrieve and handle, common parameters that may be set at the [path item level](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object).

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getParameters()` | Retrieve all parameters that may be used with on this operation. |
| `.getParametersAsJSONSchema()` | Retrieve and convert the operations parameters into an array of JSON Schema schemas for each available type of parameter available on the operation: `path`, `query`, `body`, `cookie`, `formData`, and `header`. |
| `.hasParameters()` | Determine if the operation has any parameters to send. |
| `.hasRequiredParameters()` | Determine if any of the parameters on this operation are required. |
<!-- prettier-ignore-end -->

#### Request Body

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getRequestBody()` | Retrieve the raw request body object for a given content type. If none is specified it will return either the first that's JSON-like, or the first defined. |
| `.getRequestBodyExamples()` | Retrieve an array of all request body examples that this operation has defined. |
| `.getRequestBodyMediaTypes()` | Retrieve a list of all the media/content types that the operation can accept a request body payload for. |
| `.hasRequestBody()` | Determine if this operation has a request body defined. |
| `.hasRequiredRequestBody()` | Determine if this operation has a required request body. |
<!-- prettier-ignore-end -->

#### Responses

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getResponseAsJSONSchema()` | Retrive and convert a response on this operation into JSON Schema. |
| `.getResponseByStatusCode()` | Retrieve the raw response object for a given status code. |
| `.getResponseExamples()` | Retrieve an array of all response examples that this operation has defined. |
| `.getResponseStatusCodes()` | Retrieve all status codes that this operation may respond with. |
<!-- prettier-ignore-end -->

#### Security

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getSecurity()` | Return all security requirements that are applicable for either this operation, or if the operation has none specific to it, then for the entire API. |
| `.getSecurityWithTypes()` | Return a collection of all security schemes applicable to this operation (using `.getSecurity()`), grouped by how the security should be handled (either AND or OR auth requirements). |
| `.prepareSecurity` | Return an object of every security scheme that _can_ be used on this operation, indexed by the type of security scheme it is (eg. `Basic`, `OAuth2`, `APIKey`, etc.). |
<!-- prettier-ignore-end -->

#### Specification Extensions

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.hasExtension()` | Determine if a given [specification extension](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specification-extensions) exists on this operation. |
<!-- prettier-ignore-end -->

Information about ReadMe's supported OpenAPI extensions at https://docs.readme.com/docs/openapi-extensions.

### Callbacks

The `Callback` class inherits `Operation` so every API available on instances of `Operation` is available here too. Much like `Operation`, we also support common parameters, summaries, and descriptions that may be set at the [path item level](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object) within a `callbacks` definition.

#### General

<!-- prettier-ignore-start -->
| Method | Description |
| :--- | :--- |
| `.getIdentifier()` | Retrieve the primary identifier of this callback. |
<!-- prettier-ignore-end -->

### Webhooks

Because our `Webhook` class extends `Operation`, every API that's available on the [Operation](#operation) class is available on webhooks.

### Additional Utilities

Beyond the `Oas`, `Operation`, `Callback` and `Webhook` interfaces, the `oas` library also offers additional tooling for analyzing and troubleshooting OpenAPI definitions.

#### Analyzer

The analyzer, `oas/analyzer`, allows you to run a set of query analyses on your API definition to understand the complexity of your API definition.

```ts
import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import analyzer from 'oas/analyzer';

console.log(await analyzer(petstore));
```

##### General

<!-- prettier-ignore-start -->
| Metric | Description |
| :--- | :--- |
| `mediaTypes` | What are the different media type shapes that your API operations support? |
| `operationTotal` | The total amount of operations in your definition. |
| `securityTypes`  | The different types of security that your API contains. |
<!-- prettier-ignore-end -->

##### OpenAPI Features

<!-- prettier-ignore-start -->
| Metric | Description |
| :--- | :--- |
| `additionalProperties` | Does your API use `additionalProperties`? |
| `callbacks` | Does your API use [callbacks](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object)? |
| `circularRefs` | Does your API have any circular `$ref` pointers, and if so where are they located? |
| `commonParameters` | Does your API utilize [common parameters](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object)? |
| `discriminators` | Does your API use polymorphic [discriminators](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#discriminator-object)? |
| `links` | Does your API use [links](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#link-object)? |
| `style` | Do any parameters in your API require [style](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#user-content-parameterstyle) serialization?
| `polymorphism` | Does your API use [polymorphism](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#composition-and-inheritance-polymorphism) (`anyOf`, `oneOf`, `allOf`)? |
| `serverVariables` | Does your API use [server variables](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-variable-object)? |
| `webhooks` | Does your API use [webhooks](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasWebhooks)?
| `xml` | Does any parameter or schema in your API use the [XML object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#xml-object) for declaring how a schema should be treated in XML? |
<!-- prettier-ignore-end -->

#### Reducer

> [!WARNING]
> This API is still very experimental and should not be used in production environments!

The reducer, `oas/reducer`, can be used to reduce an OpenAPI definition down to only the information necessary for a specific set of tags, paths, or operations. OpenAPI reduction can be helpful to isolate and troubleshoot issues with a very large API definition -- all while still having a fully functional and valid OpenAPI definition.

```ts
import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import reducer from 'oas/reducer';

// This will reduce the `petstore` API definition down to only operations, and
// any referenced schemas, that are a part of the `Store` tag.
console.log(reducer(petstore, { tags: ['Store'] }));

// Reduces the `petstore` down to only the `POST /pet` operation.
console.log(reducer(petstore, { paths: { '/pet': ['post'] } });

// You can also select all of the methods of a given path by using the `*`
// wildcard. The resulting reduced API definition here will contain `POST /pet`
// and `PUT /put`.
console.log(reducer(petstore, { paths: { '/pet': ['*'] } });
```

> [!NOTE]
> Though the reducer does not require you to first dereference your API definition it currently unfortunately cannot, depending on the circumstances, be used to dereference an API operation that has circular `$ref` pointers.

## FAQ

#### Can I create an OpenAPI definition with this?

Though `oas` used to offer functionality related to this, it does no longer. If you need an OpenAPI (or Swagger) definition for your API we recommend checking out the API editing experience within [ReadMe](https://readme.com), manually maintaining JSON/YAML files (it sounds worse than it actually is), or the language-agnostic [swagger-inline](https://npm.im/swagger-inline).
