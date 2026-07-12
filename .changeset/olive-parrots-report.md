---
"@readme/openapi-parser": minor
---

Full OpenAPI 3.2 support: definitions can now be parsed and validated against the published 3.2 JSON Schema, with spec-level validation coverage for `additionalOperations` (including a friendly error when an entry uses a method that already has a fixed field), `deviceAuthorization` OAuth 2.0 flows, `querystring` parameters, and sequential media type `itemSchema`s.
