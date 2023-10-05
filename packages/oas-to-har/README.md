# @readme/oas-to-har

Utility to transform an OAS operation into a [HAR](http://www.softwareishard.com/blog/har-12-spec/) representation

[![Build](https://github.com/readmeio/oas/workflows/CI/badge.svg)](https://github.com/readmeio/oas/tree/main/packages/oas-to-har) [![](https://img.shields.io/npm/v/@readme/oas-to-har)](https://npm.im/@readme/oas-to-har)

[![](https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png)](https://readme.com)

## Installation

```sh
npm install --save @readme/oas-to-har
```

## Usage

```js
import Oas from 'oas';
import oasToHar from '@readme/oas-to-har';

import petstore from './petstore.json';

const spec = new Oas(petstore);
console.log(oasToHar(spec, spec.operation('/pets', 'post')));
```

```json
{
  "log": {
    "entries": [
      {
        "request": {
          "cookies": [],
          "headers": [],
          "headersSize": 0,
          "queryString": [],
          "bodySize": 0,
          "method": "POST",
          "url": "http://petstore.swagger.io/v2/pets",
          "httpVersion": "HTTP/1.1"
        }
      }
    ]
  }
}
```

### `oasToHar(oas, operationSchema, values, auth, opts) => Object`

- `oas` _{Oas}_: Instance of our [oas/tooling](https://npm.im/oas) class.
- `operationSchema` _{Object\|Operation}_: Can either be an object with `path` and `method` properties (that exist in the supplied OAS), or an instance of our `Operation` class from [oas/tooling](https://npm.im/oas) - accessed through `new Oas(spec).operation(path, method)`.
- `values` _{Object}_: A object of payload data, with key-value data therein, that should be used to construct the request. Available data you can define here:
  - `path`
  - `query`
  - `body`
  - `cookie`
  - `formData`
  - `header`
  - `server` &mdash; If the supplied OAS has multiple severs or server variables you can use this to set which server and variables to use. Shape of it should be: `{ selected: Integer, variables: { ...key-values }}`. `selected` should coorespond to index of the `servers` array in your OAS.
- `auth` _{Object}_: Authentication information for the request.
- `opts.proxyUrl` _{Boolean}_: Boolean to toggle if composed HAR objects should have their `url` be sent through our CORS-friendly proxy. Defaults to `false`.
