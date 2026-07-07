---
"oas": major
---

Refactor `oas/analyzer` to support analyzing a single operation or webhook directly against a full API definition without needing to reduce it down first.

Breaking changes:

* `dereferencedFileSize` and `rawFileSize` are no longer supported.
* `oas/analyzer` no longer exports individual query functions, instead you can supply your specific queries as an array of strings to the `analyzer` function.
* The object that `oas/analyzer` returns has also been reshaped to no longer have a `general` and `openapi` top-level key, everything is now flattened out.
