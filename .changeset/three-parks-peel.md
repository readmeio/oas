---
"@readme/openapi-parser": minor
---

Fix `bundle()` emitting local-file-prefixed `$ref`s when an external schema has a `$id`, which broke bundled definitions once uploaded. Those refs are now rewritten as document-root pointers and the redundant nested `$id`s are removed.
