---
'@readme/openapi-parser': minor
'oas': patch
---

Reject malformed OpenAPI server URLs, including square brackets used as hostname placeholders, while preserving server variables, relative URLs, and IPv6 hosts.

Defer URL validation for undeclared server variables that can be supplied by user data at runtime.

Expose shared URL normalization and server-variable substitution from `@readme/openapi-parser/lib/urls` and reuse them in `oas` so validation and request generation follow the same matching and normalization rules. Preserve OAS user-specific variable overrides and the existing `oas/utils` regex export.
