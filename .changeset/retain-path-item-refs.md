---
"oas": patch
---

Retain Path Items and webhooks targeted by `#/paths` and `#/webhooks` `$ref`s — including whole-item and path-level parameter pointers — so reduce/prune no longer emit dangling references. Field-level pointers also keep sibling container `$ref` targets.
