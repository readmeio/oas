---
"oas": patch
---

Compiled `path-to-regexp` matchers for path templates are now cached across lookups, making repeated URL→operation resolution (`findOperation()`, `findOperationWithoutMethod()`, `getOperation()`) roughly 4-9x faster depending on definition size.
