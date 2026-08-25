---
"oas": minor
---

Add an `OpenAPIPruner` utility for removing selected tags, paths, operations, and webhooks while pruning unreachable components and tags. The shared transformer also preserves operations referenced by reduced operations and removes filtered containers without leaving dangling common-parameter references.
