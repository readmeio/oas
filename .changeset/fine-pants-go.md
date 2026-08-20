---
"@readme/openapi-parser": patch
---

Drop orphaned `$id` keywords when bundling, dereferencing, or validating. A `$id` carried onto an inlined external schema re-scoped its sibling `#/…` pointers and made bundling throw a spurious "Missing $ref pointer" error, so we now discard `$id`s that no `$ref` targets while leaving legitimate reference anchors untouched.
