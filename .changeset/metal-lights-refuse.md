---
'@readme/oas-to-har': patch
---

Resolved a bug where `allOf` schemas would be treated as JSON when their properties don't contain `format: json`.
