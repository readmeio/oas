---
"oas": patch
---

`getParametersAsJSONSchema()` no longer strips a custom `Authorization` header parameter when the operation has no applicable security scheme. `Accept` and `Content-Type` remain reserved (ReadMe computes them), but `Authorization` is only ignored when a security scheme already provides an auth affordance — otherwise dropping it silently removed the only way to authenticate the request (CX-3611).
