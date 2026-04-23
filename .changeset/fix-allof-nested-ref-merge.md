---
"oas": patch
---

Fixed `allOf` merging silently dropping properties when two or more branches define the same nested property path with `$ref` leaf values by making `inlinePropertyRefsForMerge` recurse into nested object properties.
