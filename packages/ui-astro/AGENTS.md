# UI Astro Adapter Guidance

- Render semantic HTML and mount `ui-primitives` behavior through progressive enhancement; keep client initialization idempotent.
- Preserve keyboard flow, ARIA state, focus restore and no-JS-safe markup where feasible.
- Do not recreate Select/Dialog/Modal/Popover controller logic or impose visual styling.
- Exercise behavior in the Astro 7 E2E fixture, including `ClientRouter` cleanup and remount, for lifecycle changes.
