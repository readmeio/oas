# @readme/oas-to-har

## 34.0.0

### Major Changes

- d424882: Preserve explicit empty objects in JSON request payloads while continuing to ignore empty object array items

## 33.1.7

### Patch Changes

- 7ae842b: chore(deps): bump qs from 6.15.1 to 6.15.2

## 33.1.6

### Patch Changes

- 93bddb2: Serialize request bodies according to the selected `content-type` header when operations define multiple request body media types.

## 33.1.2

### Patch Changes

- 74feed9: Default nested `multipart/form-data` object fields to bracket notation when no explicit encoding is supplied.
- 49eef87: Preserve numeric strings in JSON request body maps when `additionalProperties` defines string values.

## 33.1.1

### Patch Changes

- 6440d65: chore(deps): bump the minor-production-deps group with 3 updates
- 463031d: Preserve explicit empty arrays in JSON request payloads when generating HAR payloads.

## 33.1.0

### Minor Changes

- 2325b6f: HAR composition for requests including `formData` should respect the `content-type` header available.

## 33.0.0

### Major Changes

- 77182a7: getParameterAsJSONSchema returns based on content-type parameter

### Patch Changes

- Updated dependencies [b37f577]
- Updated dependencies [80a22cd]
- Updated dependencies [77182a7]
  - oas@33.0.0

## 32.1.15

### Patch Changes

- c4e6015: Improved support for polymorphic schema payload matching during HAR generation.
- Updated dependencies [c4e6015]
  - oas@32.1.15

## 32.1.13

### Patch Changes

- Updated dependencies [e67bb92]
  - oas@32.1.13

## 32.1.12

### Patch Changes

- 2fa29ac: Fix improper linking of `oas` package in published release.

## 31.0.15

### Patch Changes

- f930691: Resolved a bug where `allOf` schemas would be treated as JSON when their properties don't contain `format: json`.
