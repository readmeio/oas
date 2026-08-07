---
'@readme/openapi-parser': patch
'oas-normalize': patch
---

Disable filesystem `$ref` resolution (including `file://`) by default to prevent local file disclosure from untrusted specs. `resolve.file: true` now correctly opts back into the stock file resolver, and `oas-normalize` always re-asserts this policy from `enablePaths` so `validate({ parser })` cannot re-enable it.
