---
"oas-normalize": minor
"@readme/openapi-parser": minor
---

Resolve an oversight in `oas-normalize` where it did not use `@readme/openapi-parser`'s HTTP fetching mechanisms, had its own, and could load private URLs.
