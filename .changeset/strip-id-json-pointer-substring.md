---
"@readme/openapi-parser": patch
---

Ignore document-root JSON Pointer `$ref`s when deciding whether an `$id` is a live target, so leftover `$id`s that collide with `#/components/…` or `#/paths/…` pointers are stripped instead of breaking resolution.
