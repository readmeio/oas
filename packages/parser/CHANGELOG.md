# @readme/openapi-parser

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
