---
"oas": minor
---

Add an `OpenAPIPruner` utility for removing selected tags, paths, operations, operation IDs, and webhooks while pruning unreachable components and tags. Add operation ID selection to `OpenAPIReducer`, including generated IDs for operations without an authored `operationId`. The shared transformer also retains operations discovered through cross-operation references and removes metadata from containers when all their operations are filtered.
