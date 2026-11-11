---
'oas': major
'@readme/openapi-parser': major
---

Add support for parsing and validating OpenAPI 3.2 API definitions.

`getPaths()` and `getWebhooks()` include operations declared in an `additionalOperations` map.

Alongside schema validation against the OpenAPI 3.2 JSON Schema this adds specification checks for `additionalOperations` (keys must not duplicate a fixed HTTP method field), `querystring` parameters (only one per operation, and not alongside `query` parameters -- including those inherited from the path item), the `deviceAuthorization` OAuth 2 flow, `oauth2MetadataUrl`, and the relaxed `paths` / `webhooks` / `components` requirement. `isOpenAPI32()` identifies these definitions. OpenAPI 3.2 TypeScript types come from `@scalar/openapi-types`.
