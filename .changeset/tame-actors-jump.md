---
"jest-expect-har": minor
"jest-expect-jsonschema": minor
"jest-expect-openapi": minor
---

Added TypeScript support for matchers when using `@jest/globals` instead of Jest's injected globals. Previously the matcher types were only available on the ambient `jest.Matchers` namespace, which isn't picked up when `expect`/`test` are imported directly from `@jest/globals`.
