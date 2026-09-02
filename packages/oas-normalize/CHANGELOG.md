# oas-normalize

## 18.0.1

### Patch Changes

- 3a39803: chore(deps): bump js-yaml from 4.3.1 to 5.4.1
- Updated dependencies [21732a2]
- Updated dependencies [3f27c3e]
- Updated dependencies [e3f4494]
- Updated dependencies [fcfb099]
  - @readme/openapi-parser@8.0.2

## 18.0.0

### Major Changes

- 7c55763: Drop orphaned `$id` keywords when bundling, dereferencing, or validating. A `$id` carried onto an inlined external schema re-scoped its sibling `#/…` pointers and made bundling throw a spurious "Missing $ref pointer" error, so we now discard `$id`s that no `$ref` targets while leaving legitimate reference anchors untouched.

### Patch Changes

- Updated dependencies [7c55763]
  - @readme/openapi-parser@8.0.0

## 17.0.1

### Patch Changes

- 55e44a6: Disable filesystem `$ref` resolution (including `file://`) by default to prevent local file disclosure from untrusted specs. `resolve.file: true` now correctly opts back into the stock file resolver, and `oas-normalize` always re-asserts this policy from `enablePaths` so `validate({ parser })` cannot re-enable it.
- Updated dependencies [55e44a6]
  - @readme/openapi-parser@7.0.1

## 17.0.0

### Major Changes

- 99be27e: Address issues in OpenAPI URL retrievals where it private IPs could be incorrectly accessed if specified.

### Patch Changes

- Updated dependencies [99be27e]
- Updated dependencies [ff467c3]
  - @readme/openapi-parser@7.0.0

## 16.1.2

### Patch Changes

- 9a5b788: chore(deps): bump js-yaml from 4.2.0 to 4.3.0

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
