---
"@readme/openapi-parser": patch
"oas": patch
---

Upgrade `@apidevtools/json-schema-ref-parser` to v15, which is now ESM-only (bundled into our CJS build via `tsup`'s `noExternal`). Also worked around two upstream `isUnsafeUrl()` regressions that misclassified relative paths (`./foo.json`, `../foo.json`) as unsafe and bare IPv6 literals (`http://fe80::1`) as safe.

As part of this, `oas`'s circular reference analyzer (`analyzeCircularRefs()`) now reports circular `$ref`s more completely, since the upstream library's `onCircular` callback now fires for every occurrence of a circular reference instead of missing some.
