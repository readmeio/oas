---
'oas': patch
---

Preserve metadata siblings (e.g. `description`, `summary`) alongside `$ref` pointers on properties inside `allOf` branches so they survive merging instead of being silently dropped during inlining. Continues to strip the invalid `properties` sibling to keep the CX-3171 crash regression covered.
