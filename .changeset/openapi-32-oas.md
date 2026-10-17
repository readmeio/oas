---
'oas': minor
---

Add support for OpenAPI 3.2 API definitions. Webhooks are now recognized in OpenAPI 3.2 definitions, operations defined within a path item's `additionalOperations` map can be retrieved with `oas.operation(path, 'COPY')` and the new `oas.getAdditionalOperations()`, media type examples support the `dataValue` and `serializedValue` Example Object fields as well as generating a sample from `itemSchema`, and the `OASDocument`, `ParameterObject`, `MediaTypeObject`, and related types now include their OpenAPI 3.2 shapes. `isOpenAPI32()` and `OAS32Document` are exported from `oas/types`.
