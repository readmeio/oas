---
"@readme/openapi-parser": patch
---

Keep `$id` keywords that scope local fragment `$ref`s (`#`, `#/$defs/…`) so recursive and `$defs` schemas are not re-aimed at the document root.
