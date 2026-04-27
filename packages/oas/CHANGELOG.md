# oas

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
