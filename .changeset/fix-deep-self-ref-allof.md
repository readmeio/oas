---
"oas": patch
---

Fixed a crash when a schema contains a deep self-referencing `$ref` through an `allOf` (e.g. `#/components/schemas/Foo/allOf/1/properties/bar`) by sorting ref entries by path depth before merging into the root schema.
