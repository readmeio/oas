---
"oas": patch
---

Keep Path Item `$ref`s on the live definition when enumerating paths or reading webhook summaries, and match percent-encoded URLs against OAS path keys so `findOperation()` / `getOperation()` no longer miss those operations.
