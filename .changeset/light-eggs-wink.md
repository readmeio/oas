---
"@readme/openapi-parser": major
---

Upgrade `@apidevtools/json-schema-ref-parser` to 16.0.8. When bundling, a `$ref` that repeats inside an external file with its own `$id` no longer points at the local path of the root file, so the bundle resolves after it is moved or uploaded. Node.js 22.19.0 or newer is now required.
