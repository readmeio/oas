# @readme/oas-to-snippet

Transform an OpenAPI operation into a code snippet.

[![Build](https://github.com/readmeio/oas-to-snippet/workflows/CI/badge.svg)](https://github.com/readmeio/oas-to-snippet/) [![](https://img.shields.io/npm/v/@readme/oas-to-snippet)](https://npm.im/@readme/oas-to-snippet)

[![](https://raw.githubusercontent.com/readmeio/.github/main/oss-header.png)](https://readme.io)

This library was built with [ReadMe's reference guide](https://readme.com/documentation) offering in mind but it will support all OpenAPI use-cases.

## Installation

```sh
npm install --save @readme/oas-to-snippet
```

## Usage

```js
import Oas from 'oas';
import oasToSnippet from '@readme/oas-to-snippet';
import petstore from './petstore.json';

const apiDefinition = new Oas(petstore);
const operation = apiDefinition.operation('/pets', 'get');

// This is a keyed object containing formData for your operation. Available keys are: path,
// query, cookie, header, formData, and body.
const formData = {
  query: { sort: 'desc' },
};

// This is a keyed object containing authentication credentials for the operation. The keys for
// this object should match up with the `securityScheme` on the operation you're accessing, and
// its value should either be a String, or an Object containing `user` and/or `pass` (for Basic
// auth schemes).
const auth = {
  oauth2: 'bearerToken',
};

// This is the language to generate a snippet to. See below for supported languages.
//
// For supplying an alternative language target (like `axios` for `node`), you can do so by
// changing this variable to an array: `['node', 'axios']`. For the full list of alternative
// language targets that we support, see below.
const language = 'node';

// This `registryIdentifier` option is only necessary when using the `['node', 'api']` language
// combination. It controls how these snippets are used according to the code generation tooling
// that we offer with https://api.readme.dev/.
const registryIdentifier: '@petstore/v2.0#17273l2glm9fq4l5';

// This will return an object containing `code` and `highlightMode`. `code` is the generated code
// snippet, while `highlightMode` is the language mode you can use to render it for syntax
// highlighting (with @readme/syntax-highlighter, for example).
const { code, highlightMode } = oasToSnippet(apiDefinition, operation, formData, auth, language, { openapi: registryIdentifier });
```

## Supported Languages

Since this library uses [HTTP Snippet](https://github.com/Kong/httpsnippet), we support most of its languages, and their associated targets, which are the following:

<!--
To regenerate the table below, run the following:

npm run build && node bin/generate-target-markdown-table.js
 -->

<!-- prettier-ignore-start -->
<!-- table-start -->
| Language | Available language mode(s) | Libraries (if applicable)
| :---- | :---- | :---- |
| C | `c` | [Libcurl](http://curl.haxx.se/libcurl)
| Clojure | `clojure` | [clj-http](https://github.com/dakrone/clj-http)
| C++ | `cplusplus` | [Libcurl](http://curl.haxx.se/libcurl)
| C# | `csharp` | [HttpClient](https://docs.microsoft.com/en-us/dotnet/api/system.net.http.httpclient), [RestSharp](http://restsharp.org/)
| HTTP | `http` | [HTTP/1.1](https://tools.ietf.org/html/rfc7230)
| Go | `go` | [NewRequest](http://golang.org/pkg/net/http/#NewRequest)
| Java | `java` | [AsyncHttp](https://github.com/AsyncHttpClient/async-http-client), [java.net.http](https://openjdk.java.net/groups/net/httpclient/intro.html), [OkHttp](http://square.github.io/okhttp/), [Unirest](http://unirest.io/java.html)
| JavaScript | `javascript` | [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest), [Axios](https://github.com/axios/axios), [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), [jQuery](http://api.jquery.com/jquery.ajax/)
| JSON | `json` | [Native JSON](https://www.json.org/json-en.html)
| Kotlin | `kotlin` | [OkHttp](http://square.github.io/okhttp/)
| Node.js | `node` | [`api`](https://api.readme.dev), [HTTP](http://nodejs.org/api/http.html#http_http_request_options_callback), [Request](https://github.com/request/request), [Unirest](http://unirest.io/nodejs.html), [Axios](https://github.com/axios/axios), [Fetch](https://github.com/bitinn/node-fetch)
| Objective-C | `objectivec` | [NSURLSession](https://developer.apple.com/library/mac/documentation/Foundation/Reference/NSURLSession_class/index.html)
| OCaml | `ocaml` | [CoHTTP](https://github.com/mirage/ocaml-cohttp)
| PHP | `php` | [cURL](http://php.net/manual/en/book.curl.php), [Guzzle](http://docs.guzzlephp.org/en/stable/), [HTTP v1](http://php.net/manual/en/book.http.php), [HTTP v2](http://devel-m6w6.rhcloud.com/mdref/http)
| Powershell | `powershell` | [Invoke-WebRequest](https://docs.microsoft.com/en-us/powershell/module/Microsoft.PowerShell.Utility/Invoke-WebRequest), [Invoke-RestMethod](https://docs.microsoft.com/en-us/powershell/module/Microsoft.PowerShell.Utility/Invoke-RestMethod)
| Python | `python` | [Requests](http://docs.python-requests.org/en/latest/api/#requests.request)
| R | `r` | [httr](https://cran.r-project.org/web/packages/httr/vignettes/quickstart.html)
| Ruby | `ruby` | [net::http](http://ruby-doc.org/stdlib-2.2.1/libdoc/net/http/rdoc/Net/HTTP.html)
| Shell | `shell` | [cURL](http://curl.haxx.se/), [HTTPie](http://httpie.org/), [Wget](https://www.gnu.org/software/wget/)
| Swift | `swift` | [NSURLSession](https://developer.apple.com/library/mac/documentation/Foundation/Reference/NSURLSession_class/index.html)
<!-- table-end -->
<!-- prettier-ignore-end -->
