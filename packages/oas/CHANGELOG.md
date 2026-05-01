# oas

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
