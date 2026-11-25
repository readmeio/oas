---
'@readme/oas-to-har': patch
---

Path parameter array values no longer drop falsy items like `0`, `false` or `''`; only `undefined` items are removed.
