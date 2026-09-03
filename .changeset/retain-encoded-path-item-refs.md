---
"oas": patch
---

Retain Path Item `$ref` targets reached through `#/paths` and `#/webhooks` operation pointers, including component names that require JSON Pointer escaping, so reduce no longer emits dangling references.
