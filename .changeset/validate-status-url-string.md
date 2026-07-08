---
"oas": patch
---

Fix `validateExtension` rejecting `x-readme.status-url` as a boolean. The `status-url` extension was registered without a matching validator branch, so `validateExtensions()` fell through to the boolean check and threw `"x-readme.status-url" must be of type "Boolean"` for valid URL strings. It's now validated as a string.
