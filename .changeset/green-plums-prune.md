---
"oas": minor
---

Add an `OpenAPIPruner` utility for removing selected tags, paths, operations, and webhooks while pruning unreachable components and tags. The shared transformer also retains operations discovered through cross-operation references and removes metadata from containers when all their operations are filtered.
