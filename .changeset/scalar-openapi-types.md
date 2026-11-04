---
"jest-expect-openapi": major
"@readme/oas-to-snippet": major
"oas-normalize": major
"@readme/oas-to-har": major
"@readme/openapi-parser": major
"oas": major
---

Replace `openapi-types` with `@scalar/openapi-types`.

`@readme/openapi-parser` now peers on `@scalar/openapi-types` (`>=0.9.0`). Document types come from the spec entry points (`2.0`, `3.0`, `3.1`, `3.2`), so `openapi` is a string and required fields such as parameter `name` and server `url` stay required.
