---
"oas": minor
---

`findOperation()`, `findOperationWithoutMethod()`, `getOperation()` and `findOperationMatches()` now resolve URLs served by path-item and operation-level `servers`, following OpenAPI server precedence (operation, then path-item, then root). Paths without server overrides are matched against root servers exactly as before, and a cheap guard keeps lookups on root-only definitions fast.
