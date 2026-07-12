---
"oas": minor
---

OpenAPI 3.2 support: typings (via `@scalar/openapi-types`), webhooks, and a new `Oas.getAdditionalOperations()` accessor for the 3.2 `additionalOperations` path item map. `getPaths()` intentionally excludes `additionalOperations` so its `HttpMethods`-keyed return type stays intact — use `getAdditionalOperations()` for those, or `Oas.operation()`, which now falls back to `additionalOperations` for custom methods. Media type example extraction now also understands the 3.2 `dataValue` and `serializedValue` example properties with a `value` → `dataValue` → `serializedValue` precedence chain. Runtime modeling of sequential media type `itemSchema`s (e.g. sample generation) is deferred for now; they are validated but a single-item sample would misrepresent a stream and nothing renders sequential media types yet.
