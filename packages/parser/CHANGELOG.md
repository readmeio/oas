# @readme/openapi-parser

## 6.3.1

### Patch Changes

- 0baa509: Upgrade `@apidevtools/json-schema-ref-parser` to v15, which is now ESM-only (bundled into our CJS build via `tsup`'s `noExternal`). Also worked around two upstream `isUnsafeUrl()` regressions that misclassified relative paths (`./foo.json`, `../foo.json`) as unsafe and bare IPv6 literals (`http://fe80::1`) as safe.

  As part of this, `oas`'s circular reference analyzer (`analyzeCircularRefs()`) now reports circular `$ref`s more completely, since the upstream library's `onCircular` callback now fires for every occurrence of a circular reference instead of missing some.

## 6.3.0

## 6.2.1

### Patch Changes

- Updated dependencies [7c4b3e3]
  - @readme/openapi-schemas@4.0.0

## 6.2.0

### Minor Changes

- 3a72608: Resolve an oversight in `oas-normalize` where it did not use `@readme/openapi-parser`'s HTTP fetching mechanisms, had its own, and could load private URLs.

## 6.1.3

### Patch Changes

- 7193d10: chore(deps): bump the minor-production-deps group with 3 updates

## 6.1.2

### Patch Changes

- 94c4684: chore(deps): updating `fast-uri` to the latest release

## 6.1.1

### Patch Changes

- 6440d65: chore(deps): bump the minor-production-deps group with 3 updates

## 6.1.0

### Minor Changes

- 4a1f41c: Added pre-AJV validation for quirky security schemes. Surfaces clear, targeted errors (missing `type`, cross-type contamination, invalid `apiKey.in`, empty `oauth2.flows`, Swagger 2.0 ↔ OAS 3.x type confusion) instead of AJV's noisy `oneOf` failures, configurable via the new `invalid-security-scheme-properties` rule.
