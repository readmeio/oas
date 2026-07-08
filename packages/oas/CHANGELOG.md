# oas

## 38.0.0

### Major Changes

- c0a781d: Refactor `oas/analyzer` to support analyzing a single operation or webhook directly against a full API definition without needing to reduce it down first.

  Breaking changes:
  - `dereferencedFileSize` and `rawFileSize` are no longer supported.
  - `oas/analyzer` no longer exports individual query functions, instead you can supply your specific queries as an array of strings to the `analyzer` function.
  - The object that `oas/analyzer` returns has also been reshaped to no longer have a `general` and `openapi` top-level key, everything is now flattened out.

## 37.2.0

### Minor Changes

- fc54c1e: Add support for examples in $ref pointers

### Patch Changes

- @readme/openapi-parser@6.2.1

## 37.1.0

### Minor Changes

- 97a92d0: Add support for the `status-url` ReadMe extension (`x-readme.status-url`). This customer-declared health/status URL is surfaced to AI agents as the RFC 9727 `status` link relation in the project's `/.well-known/api-catalog`.

## 37.0.0

### Major Changes

- 47c78b3: Removing support for dereferencing from `oas` in a targeted effort to make the library build smaller in compiled browser environments. For folks who still need dereferencing capabilities we recommend using `@readme/openapi-parser`.

### Minor Changes

- 1f3cf1d: Add operation-aware server helpers that resolve OpenAPI servers from operation, path-item, and root-level definitions.

  Update HAR generation to construct request URLs from operation-aware servers.

### Patch Changes

- 1bca5ca: `getParametersAsJSONSchema()` no longer strips a custom `Authorization` header parameter when the operation has no applicable security scheme. `Accept` and `Content-Type` remain reserved (ReadMe computes them), but `Authorization` is only ignored when a security scheme already provides an auth affordance — otherwise dropping it silently removed the only way to authenticate the request (CX-3611).

## 36.0.3

### Patch Changes

- f814fae: Remove dependency on `memoizee`

## 36.0.2

### Patch Changes

- fc3e51d: Ignore reserved custom header parameters when generating JSON Schema for operations.

## 36.0.1

### Patch Changes

- bfac913: Support OAuth client credential defaults in `x-default` security schemes without treating them as access token defaults.

## 36.0.0

### Minor Changes

- bac9a76: Add support for `example` keyword with `$ref` pointers

## 34.1.0

### Minor Changes

- 2f9cae6: Add support for using `x-default` to prefill HTTP Basic auth credentials.

## 34.0.2

### Patch Changes

- 04497bc: Prefer schema-level examples before generating samples from composed schemas.
- cecc41f: chore(deps): bump remove-undefined-objects from 7.0.0 to 9.0.0
- Updated dependencies [7193d10]
  - @readme/openapi-parser@6.1.3

## 34.0.1

### Patch Changes

- 8e2c4f4: When an `allOf` merge throws on an irreconcilable nested conflict (eg. `properties.foo.type` being `array` in one branch and `object` in another), the previous fallback deleted the entire `allOf` and left the schema with no `type` or `properties` — leaving downstream renderers nothing to display. The fallback now does a best-effort shallow merge of each branch's `properties` (last branch wins on conflicting keys), unions `required`, and infers `type: object` when the result has properties, so consumers still see most of the schema's shape.

## 33.2.0

### Minor Changes

- b67d0ae: Adding support to `oas/analyzer` for detecting plain `$ref` pointer usage.

## 33.1.5

### Patch Changes

- f0efe36: Resolve nested `$ref` pointers in schema-level examples when generating response samples.

## 33.1.4

### Patch Changes

- 639c755: Fixed `hideReadOnlyProperties` and `hideWriteOnlyProperties` filtering for properties whose flag sits behind a bare `$ref` (a common OpenAPI 3.0 workaround, since the spec forbids those flags as siblings of `$ref`) or that are declared alongside an `allOf` on the same schema. In both cases the property's converted form became empty but was leaking through the merge as either a `$ref` pointer or an empty `{}` placeholder, fooling the deletion guard into preserving it.

## 33.1.3

### Patch Changes

- 4a2f23e: Isolate default lookup while traversing sibling schemas so inline object defaults from one property do not apply to siblings with matching nested property names.

## 33.0.0

### Major Changes

- 77182a7: getParameterAsJSONSchema returns based on content-type parameter

### Patch Changes

- b37f577: Preserve metadata siblings (e.g. `description`, `summary`) alongside `$ref` pointers on properties inside `allOf` branches so they survive merging instead of being silently dropped during inlining. Continues to strip the invalid `properties` sibling to keep the CX-3171 crash regression covered.
- 80a22cd: Deep-merge `allOf` branches when nested properties at the same path resolve through a chain of `$ref` schemas. Previously `inlinePropertyRefsForMerge` only inlined one ref level deep; if two branches reached the same property path through chained refs, the inner refs survived into `json-schema-merge-allof`, which silently kept only the first branch. Now `allOf` branches are scanned for conflicting property paths and refs along those paths are recursively inlined before merging. Non-conflicting refs are still preserved.
- Updated dependencies [4a1f41c]
  - @readme/openapi-parser@6.1.0

## 32.1.18

### Patch Changes

- 6867a30: Fixed `oneOf`/`anyOf` items being duplicated when a variant contains a deep `$ref` through an `allOf` path by inlining stale allOf-path refs before the `allOf` merge.

## 32.1.17

### Patch Changes

- 0008dcb: Fixed `allOf` merging silently dropping properties when two or more branches define the same nested property path with `$ref` leaf values by making `inlinePropertyRefsForMerge` recurse into nested object properties.

## 32.1.16

### Patch Changes

- bf07fe4: Fixed a crash when a schema contains a deep self-referencing `$ref` through an `allOf` (e.g. `#/components/schemas/Foo/allOf/1/properties/bar`) by sorting ref entries by path depth before merging into the root schema.

## 32.1.15

### Patch Changes

- c4e6015: Improved support for polymorphic schema payload matching during HAR generation.

## 32.1.13

### Patch Changes

- e67bb92: Fixing issues in JSON Schema generation where `$ref` pointers in subschemas weren't always preserved.
