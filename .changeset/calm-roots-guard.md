---
"@readme/openapi-parser": minor
"oas-normalize": minor
---

Confine filesystem `$ref` resolution to a root directory.

`resolve.file: true` and `oas-normalize`'s `enablePaths: true` no longer grant access to the whole filesystem. Absolute paths, `file://` URLs, and relative paths that leave the root are rejected, and symlinks are not followed. Pass `resolve.fileRoot` or `pathsRoot` to choose the directory. When the API source is a local file and no root is given, the file's directory is the root. Inline schemas must set a root before any filesystem `$ref` is read. `validate({ parser })` cannot widen `oas-normalize`'s root. Filesystem reads require `/proc/self/fd` and are refused on platforms that do not provide it.
