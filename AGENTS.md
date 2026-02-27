## Cursor Cloud specific instructions

This is a Lerna-managed npm monorepo (`readmeio/oas`) with 12 packages under `packages/`. It provides OpenAPI/Swagger/HAR/Postman tooling as pure JS/TS libraries — no servers, databases, or Docker required.

### Key commands

All commands are run from the workspace root. See `package.json` scripts for full list.

- **Install**: `npm ci`
- **Build all packages**: `npm run build` (Lerna + tsup; also runs automatically as `pretest` and `prelint`)
- **Test**: `npm test` (Vitest with coverage across all workspace projects)
- **Lint**: `npm run lint` (knip + tsc + biome + prettier; builds first via `prelint`)

### Gotchas

- The VM sets `NO_COLOR=1` and `FORCE_COLOR=0`, which causes 2 colorize-related snapshot tests to fail (`@readme/openapi-parser` and `oas-normalize`). Run tests with `NO_COLOR= FORCE_COLOR=1 npm test` to pass all tests. This is an environment issue, not a code bug.
- `npm run build` must complete before tests or lint — the `pretest` and `prelint` scripts handle this automatically, so running `npm test` or `npm run lint` from root is self-contained.
- Node.js >=20 is required (`engines` field in root `package.json`).
