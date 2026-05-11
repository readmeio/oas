---
'oas': patch
---

Fixed `hideReadOnlyProperties` and `hideWriteOnlyProperties` filtering for properties whose flag sits behind a bare `$ref` (a common OpenAPI 3.0 workaround, since the spec forbids those flags as siblings of `$ref`) or that are declared alongside an `allOf` on the same schema. In both cases the property's converted form became empty but was leaking through the merge as either a `$ref` pointer or an empty `{}` placeholder, fooling the deletion guard into preserving it.
