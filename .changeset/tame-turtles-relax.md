---
"@readme/oas-to-har": patch
---

Fix header parameters not being matched against supplied values when the parameter name and the value's key differ only in casing (e.g. `X-Customer-Code` vs `x-customer-code`)
