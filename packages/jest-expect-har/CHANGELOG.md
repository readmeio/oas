# jest-expect-har

## 11.0.0

### Major Changes

- 1e60a00: Drop support for Vitest 4. These matchers now require Vitest 5 (Jest 30 is unchanged).

## 10.1.2

### Patch Changes

- 21732a2: chore(deps): bump @vitest/expect from 4.1.10 to 4.1.11 in the minor-production-deps group

## 10.1.1

### Patch Changes

- ff467c3: `@readme/oas-to-snippet` gets support for generating "Agent Prompt" code snippets, and also a few minor dependencies were upgraded.

## 10.1.0

### Minor Changes

- fe54c62: Added TypeScript support for matchers when using `@jest/globals` instead of Jest's injected globals. Previously the matcher types were only available on the ambient `jest.Matchers` namespace, which isn't picked up when `expect`/`test` are imported directly from `@jest/globals`.

## 10.0.3

### Patch Changes

- 7193d10: chore(deps): bump the minor-production-deps group with 3 updates

## 10.0.2

### Patch Changes

- 6440d65: chore(deps): bump the minor-production-deps group with 3 updates
