# OpenAPI Parser API

## Things to Know
- [Class methods vs. Instance methods](#class-methods-vs-instance-methods)
- [Callbacks vs. Promises](#callbacks-vs-promises)
- [Circular references](#circular-refs)


## Classes & Methods

#### [The `OpenAPIParser` class](openapi-parser.md)
- [`api` property](openapi-parser.md#api)
- [`$refs` property](openapi-parser.md#refs)
- [`validate()` method](openapi-parser.md#validateapi-options-callback)
- [`dereference()` method](openapi-parser.md#dereferenceapi-options-callback)
- [`bundle()` method](openapi-parser.md#bundleapi-options-callback)
- [`parse()` method](openapi-parser.md#parseapi-options-callback)
- [`resolve()` method](openapi-parser.md#resolveapi-options-callback)

#### [The `$Refs` class](refs.md)
- [`circular` property](refs.md#circular)
- [`paths()` method](refs.md#pathstypes)
- [`values()` method](refs.md#valuestypes)
- [`exists()` method](refs.md#existsref)
- [`get()` method](refs.md#getref-options)
- [`set()` method](refs.md#setref-value-options)

#### [The `Options` object](options.md)


### Class methods vs. Instance methods
All of Swagger Parser's methods are available as static (class) methods, and as instance methods.  The static methods simply create a new [`OpenAPIParser`](openapi-parser.md) instance and then call the corresponding instance method.  Thus, the following line...

```javascript
OpenAPIParser.validate("my-api.yaml");
```

... is the same as this:

```javascript
let parser = new OpenAPIParser();
parser.validate("my-api.yaml");
```

The difference is that in the second example you now have a reference to `parser`, which means you can access the results ([`parser.api`](openapi-parser.md#api-object) and [`parser.$refs`](openapi-parser.md#refs)) anytime you want, rather than just in the callback function.


### Callbacks vs. Promises
Many people prefer `async`/`await` or [Promise](http://javascriptplayground.com/blog/2015/02/promises/) syntax instead of callbacks.  Swagger Parser allows you to use whichever one you prefer.

If you pass a callback function to any method, then the method will call the callback using the Node.js error-first convention.  If you do _not_ pass a callback function, then the method will return a Promise.

The following two examples are equivalent:

```javascript
// Callback syntax
OpenAPIParser.validate(mySchema, (err, api) => {
  if (err) {
    // Error
  }
  else {
    // Success
  }
});
```

```javascript
try {
  // async/await syntax
  let api = await OpenAPIParser.validate(mySchema);

  // Success
}
catch(err) {
  // Error
}
```


### Circular $Refs
Swagger APIs can contain [circular $ref pointers](https://gist.github.com/JamesMessinger/d18278935fc73e3a0ee1), and Swagger Parser fully supports them. Circular references can be resolved and dereferenced just like any other reference.  However, if you intend to serialize the dereferenced api as JSON, then you should be aware that [`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) does not support circular references by default, so you will need to [use a custom replacer function](https://stackoverflow.com/questions/11616630/json-stringify-avoid-typeerror-converting-circular-structure-to-json).

You can disable circular references by setting the [`dereference.circular`](options.md) option to `false`. Then, if a circular reference is found, a `ReferenceError` will be thrown.

Or you can choose to just ignore circular references altogether by setting the [`dereference.circular`](options.md) option to `"ignore"`.  In this case, all non-circular references will still be dereferenced as normal, but any circular references will remain in the schema.

Another option is to use the [`bundle`](openapi-parser.md#bundleapi-options-callback) method rather than the [`dereference`](openapi-parser.md#dereferenceapi-options-callback) method.  Bundling does _not_ result in circular references, because it simply converts _external_ `$ref` pointers to _internal_ ones.

```javascript
"person": {
    "properties": {
        "name": {
          "type": "string"
        },
        "spouse": {
          "type": {
            "$ref": "#/person"        // circular reference
          }
        }
    }
}
```
