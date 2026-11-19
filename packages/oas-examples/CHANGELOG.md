# @readme/oas-examples

## 9.0.0

### Major Changes

- 2c564b3: Add OpenAPI 3.2 example definitions under `3.2/`: a petstore, a webhooks-only definition, and `openapi32-features` showcasing the HTTP `QUERY` method, `additionalOperations`, `querystring` parameters, `itemSchema`, `dataValue` / `serializedValue` examples, `components.mediaTypes`, the `deviceAuthorization` OAuth 2 flow, and more.

### Patch Changes

- 11d95e1: Add an OpenAPI 3.2 bookstore example that showcases tag grouping with `parent`, `kind`, and `summary`.
- b0c81cb: chore(deps-dev): upgrade oxlint, oxfmt, and vitest

## 8.2.2

### Patch Changes

- 1f3cf1d: Add operation-aware server helpers that resolve OpenAPI servers from operation, path-item, and root-level definitions.

  Update HAR generation to construct request URLs from operation-aware servers.
