<p align="center">
  <a href="https://npm.im/oas">
    <img src="https://raw.githubusercontent.com/readmeio/oas/main/.github/hero.png" alt="oas" />
  </a>
</p>

<p align="center">
  Comprehensive tooling for working with OpenAPI definitions
</p>

<p align="center">
  <a href="https://npm.im/oas"><img src="https://img.shields.io/npm/v/oas.svg?style=for-the-badge" alt="NPM Version"></a>
  <a href="https://npm.im/oas"><img src="https://img.shields.io/node/v/oas.svg?style=for-the-badge" alt="Node Version"></a>
  <a href="https://npm.im/oas"><img src="https://img.shields.io/npm/l/oas.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/readmeio/oas"><img src="https://img.shields.io/github/workflow/status/readmeio/oas/CI.svg?style=for-the-badge" alt="Build status"></a>
</p>

`oas` is the library that we've built at [ReadMe](https://readme.com) for powering everything we do related to [OpenAPI](https://www.openapis.org/); from our [Reference Guides](https://readme.com/documentation), to our [Metrics product](https://readme.com/metrics), or to other in-house tooling like [code generation](https://npm.im/@readme/oas-to-snippet), [request execution](https://npm.im/@readme/oas-to-har), and [SDK code generation](https://api.readme.dev/).

- [Installation](https://api.readme.dev/docs/installation)
- [Usage](#usage)
  - [OpenAPI definitions](#openapi-definitions)
    - [General](#oas-general)
    - [Operations](#oasoperations)
    - [Servers](#oas-servers)
    - [Specification Extensions](#oas-extensions)
    - [User Authentication](#oas-auth)
  - [Operations](#operations)
  - [Webhooks](#webhooks)
- [FAQ](#faq)

## Installation

```
npm install oas
```

## Usage

> ℹ️ If you need to use this library within a browser you'll likely need to use a bundler like [Webpack](https://webpack.js.org/) or [Rollup](https://rollupjs.org/).

`oas` offers a main `Oas` class, which will be your main entrypoint for using the library.

```js
import Oas from 'oas';
import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json';

const petstore = new Oas(petstoreSpec);
```
Here the `Oas` constructor takes a JSON API definition (`petstoreSpec`). All API definitions you fee it must be JSON and must be an OpenAPI definition. If you have a YAML or Swagger definition you will need to convert it (our [oas-normalize](https://npm.im/oas-normalize) library can do this for you). From here, the following APIs are at your disposal.

> If you're in a CJS or non-`import` environment you can pull the library in with `require('oas').default`.

### OpenAPI definitions

> ℹ️ This library has full TypeScript types and docblocks so consult that for more in-depth documentation.

#### General {#oas-general}

| Method | Description |
| :--- | :--- |
| `oas.dereference()` | Dereference the current OpenAPI definition. Note that this will ignore circular references. |
| `oas.getDefinition()` | Retrieve the OpenAPI definition that was fed into the `Oas` constructor. |
| `oas.getTags()` | Retrieve an array of all tags that exist within the API definition and are set on operations. |
| `oas.getPaths()` | Retrieve every operation that exists within the API definition. This returns instances of the `Operation` class. |
| `oas.getVersion()` | Retrieve the OpenAPI version that this API definition is targeted for. |
| `oas.getWebhooks()` | Retrieve every webhook operation that exists within the API definition. This returns instances of the `Webhook` class. |
| `oas.init()` | An alternative for `new Oas()` that you can use if the typing on the `Oas` constructor gives you trouble. Typing OpenAPI definitions is hard! |

#### Operations {#oas-operations}

| Method | Description |
| :--- | :--- |
| `oas.findOperation()` | Discover an operation with the current OpenAPI definition that matches a given URL and HTTP method. |
| `oas.findOperationWithoutMethod()` | Like `oas.findOperation()` but without supplying an HTTP method. |
| `oas.getOperation()` | Same as `oas.findOperation()` but this returns an instance of the `Operation` class.
| `oas.operation()` | Retrieve an instance of the `Operation` or `Webhook` classes for a given path and HTTP method. |

#### Servers {#oas-servers}

| Method | Description |
| :--- | :--- |
| `oas.defaultVariables()` | Retrieve the default server variables for a specific server URL, while also potentially factoring in user data. You can specify user variable data to the `Oas` constructor. Check out [Using Variables in Documentation](https://docs.readme.com/docs/user-data-options#using-variables-in-documentation) for some background on how we use this. |
| `oas.replaceUrl()` | Replace a given templated server URL with supplied server variable data. |
| `oas.splitUrl()` | Chunk out a specific server URL into its individual parts. |
| `oas.splitVariables` | Chunk out a given URL and if it matches a server URL in the OpenAPI file, extract the matched server varialbes that are present in the URL. |
| `oas.url()` | Retrive a fully composed server URL. You can optionally select which of the defined server URLs to use as well as specify server variable information. |
| `oas.variables()` | Retrieve all server variables that a specific server URL in the definition has. |

#### Specification Extensions {#oas-extensions}

| Method | Description |
| :--- | :--- |
| `oas.getExtension()` | Retrieve a given [specification extension](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions) if it exists at the root of the API definition. |
| `oas.hasExtension()` | Determine if a given [specification extension](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#specificationExtensions) exists on the root of the API definition. |

#### User Authentication {#oas-auth}

| Method | Description |
| :--- | :--- |
| `oas.getAuth()` | Retrieve the appropriate API keys for the current OpenAPI definition from an object of user data. Check out [Using Variables in Documentation](https://docs.readme.com/docs/user-data-options#using-variables-in-documentation) for some background on how we use this. |

---

### Operations
### Webhooks

Because our `Webhook` class extensions `Operation`, every API that's available on the [Operation](#operation) class is available on webhooks.

## FAQ
#### Can I create an OpenAPI definition with this?
Though `oas` used to offer functionality related to this it does no longer. If you need an OpenAPI (or Swagger) definition for your API we recommend checking out the language-agnostic [swagger-inline](https://npm.im/swagger-inline), the API editing experience within [ReadMe](https://readme.com), or manually maintaining JSON/YAML files (it sounds worse than it actually is).
