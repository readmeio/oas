---
"jest-expect-openapi": major
"@readme/oas-to-snippet": major
"oas-normalize": major
"@readme/oas-to-har": major
"@readme/openapi-parser": major
"oas": major
---

Replace `openapi-types` with `@scalar/openapi-types`.

`@readme/openapi-parser` now peers on `@scalar/openapi-types` (`>=0.9.0`). Fields on those OpenAPI types are optional. `openapi` on `OASDocument` and `APIDocument` stays a `string`, so 3.2 documents and unnarrowed version strings still typecheck.
