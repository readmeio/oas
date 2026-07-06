---
"oas": minor
---

Add `analyzeOperation()` and `analyzeWebhookOperation()` to the analyzer, allowing a single operation or webhook to be analyzed directly against a full API definition without needing to reduce it down first. Dereferencing and JSONPath scanning are now cached per definition, so analyzing many operations out of the same definition no longer repeats that work for each one.
