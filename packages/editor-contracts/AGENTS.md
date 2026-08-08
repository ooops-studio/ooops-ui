# Editor Contracts Guidance

- Keep contracts framework-neutral, JSON-safe and dependency-free.
- Treat schema changes as public API changes and keep TypeScript validators and JSON Schemas aligned.
- Reject unsafe keys, duplicate identifiers and unbounded metadata; never execute project metadata.
