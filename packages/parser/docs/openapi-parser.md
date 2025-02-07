# `SwaggerParser` class

This is the default export of Swagger Parser. You can create instances of this class using `new SwaggerParser()`, or you can just call its [static methods](README.md#class-methods-vs-instance-methods).

##### Properties

- [`api`](#api)
- [`$refs`](#refs)

##### Methods

- [`validate()`](#validateapi-options)
- [`dereference()`](#dereferenceapi-options)
- [`bundle()`](#bundleapi-options)
- [`parse()`](#parseapi-options)
- [`resolve()`](#resolveapi-options)

### `api`

The `api` property is the parsed/bundled/dereferenced Swagger API object. This is the same value that is passed when calling the [`parse`](#parseapi-options), [`bundle`](#bundleapi-options), or [`dereference`](#dereferenceapi-options) methods.

```javascript
let parser = new SwaggerParser();

parser.api; // => null

let api = await parser.dereference('my-api.yaml');

typeof parser.api; // => "object"

api === parser.api; // => true
```

### `$refs`

The `$refs` property is a [`$Refs`](refs.md) object, which lets you access all of the externally-referenced files in the API, as well as easily get and set specific values in the schema using JSON pointers.

This is the same value that is passed when calling the [`resolve`](#resolveapi-options) method.

```javascript
let parser = new SwaggerParser();

parser.$refs.paths(); // => [] empty array

await parser.dereference('my-api.json');

parser.$refs.paths(); // => ["my-api.json"]
```

### `validate(api, [options])`

- **api** (_required_) - `string` or `object`<br>
  A [Swagger Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object), or the file path or URL of your Swagger API. See the [`parse`](#parseapi-options) method for more info.

- **options** (_optional_) - `object`<br>
  See [options](options.md) for the full list of options

- **Return Value:** `Promise`<br>
  The dereferenced and validated [Swagger object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object).

Validates the Swagger API against the [Swagger 2.0 schema](https://github.com/OAI/OpenAPI-Specification/blob/main/schemas/v2.0/schema.json), [OpenAPI 3.0 Schema](https://github.com/OAI/OpenAPI-Specification/blob/main/schemas/v3.0/schema.json), or [OpenAPI 3.1 Schema](https://github.com/OAI/OpenAPI-Specification/blob/main/schemas/v3.1/schema.json).

If [the `validate.spec` option](options.md#validate-options) is enabled, then this method also validates against the [Swagger 2.0 spec](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md). The specification validator will catch some things that aren't covered by the Swagger 2.0 Schema, such as duplicate parameters, invalid MIME types, etc.

If validation fails, then the Promise will be rejected. Either way, the error will contain information about why the API is invalid.

This method calls [`dereference`](#dereferenceapi-options) internally, so the returned [Swagger object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object) is fully dereferenced.

```javascript
try {
  let api = await SwaggerParser.validate('my-api.yaml');
  console.log('Yay! The API is valid.');
} catch (err) {
  console.error('Onoes! The API is invalid. ' + err.message);
}
```

### `dereference(api, [options])`

- **api** (_required_) - `string` or `object`<br>
  A [Swagger Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object), or the file path or URL of your Swagger API. See the [`parse`](#parseapi-options) method for more info.

- **options** (_optional_) - `object`<br>
  See [options](options.md) for the full list of options

- **Return Value:** `Promise`<br>
  The dereferenced [Swagger object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object).

Dereferences all `$ref` pointers in the Swagger API, replacing each reference with its resolved value. This results in a [Swagger object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object) that does not contain _any_ `$ref` pointers. Instead, it's a normal JavaScript object tree that can easily be crawled and used just like any other JavaScript object. This is great for programmatic usage, especially when using tools that don't understand JSON references.

The `dereference` method maintains object reference equality, meaning that all `$ref` pointers that point to the same object will be replaced with references to the same object. Again, this is great for programmatic usage, but it does introduce the risk of [circular references](README.md#circular-refs), so be careful if you intend to serialize the API using [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify). Consider using the [`bundle`](#bundleapi-options) method instead, which does not create circular references.

```javascript
let api = await SwaggerParser.dereference('my-api.yaml');

// The `api` object is a normal JavaScript object,
// so you can easily access any part of the API using simple dot notation
console.log(api.definitions.person.properties.firstName); // => {type: "string"}
```

### `bundle(api, [options])`

- **api** (_required_) - `string` or `object`<br>
  A [Swagger Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object), or the file path or URL of your Swagger API. See the [`parse`](#parseapi-options) method for more info.

- **options** (_optional_) - `object`<br>
  See [options](options.md) for the full list of options

- **Return Value:** `Promise<api>`<br>
  The bundled [Swagger object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object).

Bundles all referenced files/URLs into a single api that only has _internal_ `$ref` pointers. This lets you split-up your API however you want while you're building it, but easily combine all those files together when it's time to package or distribute the API to other people. The resulting API size will be small, since it will still contain _internal_ JSON references rather than being [fully-dereferenced](#dereferenceapi-options).

This also eliminates the risk of [circular references](README.md#circular-refs), so the API can be safely serialized using [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

```javascript
let api = await SwaggerParser.bundle('my-api.yaml');
console.log(api.definitions.person); // => {$ref: "#/definitions/schemas~1person.yaml"}
```

### `parse(api, [options])`

- **api** (_required_) - `string` or `object`<br>
  A [Swagger Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object), or the file path or URL of your Swagger API.
  <br><br>
  The path can be absolute or relative. In Node, the path is relative to `process.cwd()`. In the browser, it's relative to the URL of the page.

- **options** (_optional_) - `object`<br>
  See [options](options.md) for the full list of options

- **Return Value:** `Promise`<br>
  The parsed [Swagger object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object), or a rejected error.

> This method is used internally by other methods, such as [`bundle`](#bundleapi-options) and [`dereference`](#dereferenceapi-options). You probably won't need to call this method yourself.

Parses the given Swagger API (in JSON or YAML format), and returns it as a JavaScript object. This method **does not** resolve `$ref` pointers or dereference anything. It simply parses _one_ file and returns it.

```javascript
let api = await SwaggerParser.parse('my-api.yaml');
console.log('API name: %s, Version: %s', api.info.title, api.info.version);
```

### `resolve(api, [options])`

- **api** (_required_) - `string` or `object`<br>
  A [Swagger Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/2.0.md#swagger-object), or the file path or URL of your Swagger API. See the [`parse`](#parseapi-options) method for more info.

- **options** (_optional_) - `object`<br>
  See [options](options.md) for the full list of options

- **Return Value:** `Promise`<br>
  A [`$Refs`](refs.yaml) object.

> This method is used internally by other methods, such as [`bundle`](#bundleapi-options) and [`dereference`](#dereferenceapi-options). You probably won't need to call this method yourself.

Resolves all JSON references (`$ref` pointers) in the given Swagger API. If it references any other files/URLs, then they will be downloaded and resolved as well (unless `options.$refs.external` is false). This method **does not** dereference anything. It simply gives you a [`$Refs`](refs.yaml) object, which is a map of all the resolved references and their values.

```javascript
let $refs = await SwaggerParser.resolve('my-api.yaml');

// $refs.paths() returns the paths of all the files in your API
let filePaths = $refs.paths();

// $refs.get() lets you query parts of your API
let name = $refs.get('schemas/person.yaml#/properties/name');

// $refs.set() lets you change parts of your API
$refs.set('schemas/person.yaml#/properties/favoriteColor/default', 'blue');
```
