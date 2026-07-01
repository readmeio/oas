# oas-normalize

## 16.1.1

### Patch Changes

- e7c6158: Improved handling for when a URL to retrieve an API definition returns a non-200 HTTP status code or invalid JSON.

## 16.1.0

### Minor Changes

- 3a72608: Resolve an oversight in `oas-normalize` where it did not use `@readme/openapi-parser`'s HTTP fetching mechanisms, had its own, and could load private URLs.

### Patch Changes

- Updated dependencies [3a72608]
  - @readme/openapi-parser@6.2.0

## 16.0.5

### Patch Changes

- 7193d10: chore(deps): bump the minor-production-deps group with 3 updates
- Updated dependencies [7193d10]
  - @readme/openapi-parser@6.1.3
