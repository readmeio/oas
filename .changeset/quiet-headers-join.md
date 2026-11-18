---
'@readme/oas-to-har': patch
---

Schema-based header parameters with array or object values and no explicit `style` are now serialized with the default `simple` style into a single header instead of being split into one header per key or array item.
