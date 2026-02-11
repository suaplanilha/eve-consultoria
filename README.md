# Contributing

## API and Service Rules

- Do not create new API functions when an equivalent exists. Extend the existing response or add a wrapper.
- Business logic must live in a dedicated service module (e.g., `ProjetoHealthService`) and be reused by all endpoints.
- Router actions must be unique. Deprecated actions must be treated as aliases to the canonical handler.
- No direct `google.script.run` calls are allowed outside the frontend `SAE.exec` gate.
