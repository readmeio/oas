---
'oas': patch
---

Deep-merge `allOf` branches when nested properties at the same path resolve through a chain of `$ref` schemas. Previously `inlinePropertyRefsForMerge` only inlined one ref level deep; if two branches reached the same property path through chained refs, the inner refs survived into `json-schema-merge-allof`, which silently kept only the first branch. Now allOf branches are scanned for conflicting property paths and refs along those paths are recursively inlined before merging. Non-conflicting refs are still preserved.
