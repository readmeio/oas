# @readme/openapi-parser

## 6.1.0

### Minor Changes

- 4a1f41c: Added pre-AJV validation for quirky security schemes. Surfaces clear, targeted errors (missing `type`, cross-type contamination, invalid `apiKey.in`, empty `oauth2.flows`, Swagger 2.0 ↔ OAS 3.x type confusion) instead of AJV's noisy `oneOf` failures, configurable via the new `invalid-security-scheme-properties` rule.
