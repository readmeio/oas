---
'@readme/openapi-parser': minor
---

Validating a large API definition with schema errors no longer exhausts the heap: code frames are skipped for definitions of 5,000,000 characters or more (also when the definition exceeds the maximum string length), and the new `validate.errors.codeFrames` option disables them for any definition. Reducing Ajv errors is now linear instead of quadratic, and no longer drops errors of sibling paths that share a prefix (eg. `/parameters/1` and `/parameters/10`).
