---
"oas": patch
---

When an `allOf` merge throws on an irreconcilable nested conflict (eg. `properties.foo.type` being `array` in one branch and `object` in another), the previous fallback deleted the entire `allOf` and left the schema with no `type` or `properties` — leaving downstream renderers nothing to display. The fallback now does a best-effort shallow merge of each branch's `properties` (last branch wins on conflicting keys), unions `required`, and infers `type: object` when the result has properties, so consumers still see most of the schema's shape.
