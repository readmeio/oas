---
"oas": patch
"@readme/oas-to-har": patch
---

Match HTTP security scheme names case-insensitively, so `scheme: Bearer` and `scheme: Basic` get the same auth handling as `bearer` and `basic`.
