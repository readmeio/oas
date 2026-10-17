---
'@readme/openapi-parser': minor
---

Add support for parsing and validating OpenAPI 3.2 API definitions. Alongside schema validation against the OpenAPI 3.2 JSON Schema this adds specification checks for `additionalOperations` (keys must not duplicate a fixed HTTP method field), `querystring` parameters (only one per operation, and not alongside `query` parameters -- including those inherited from the path item), the `deviceAuthorization` OAuth 2 flow, `oauth2MetadataUrl`, and the relaxed `paths` / `webhooks` / `components` requirement. OpenAPI 3.2 TypeScript definitions are available from the new `OpenAPIV3_2` type export and `isOpenAPI32()` type guard.
