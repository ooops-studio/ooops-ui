# Architecture

## One behavior source

`@ooopsstudio/ui-primitives` is the source of truth for state transitions, keyboard interaction, focus, positioning and DOM events. Framework packages adapt controllers; they do not maintain independent interaction implementations.

Focus behavior comes from `@ooopsstudio/accessibility`. `ui-primitives` re-exports its canonical `createFocusTrap` API so consumers do not need a second implementation.

## Package boundaries

- `ui-primitives` may depend on accessibility and browser platform APIs. It must not depend on Astro, Svelte or project styling.
- `ui-astro` may depend on primitives and peer-depend on Astro. Its runtime must remain idempotent across Astro view transitions.
- `ui-svelte` may depend on primitives and peer-depend on Svelte. Components may expose reactive bindings and snippets but must delegate behavior to controllers.
- Base CSS is optional. Product-specific design never belongs in the controller layer.

Combobox and MultiSelect are separate future primitives. The Select API must remain non-editable and single-value so those responsibilities do not overlap.

## Migration from project-local components

1. Identify behavior currently embedded in a component.
2. Map it to a controller option or add the generic capability to `ui-primitives` with tests.
3. Replace local behavior with the relevant Astro or Svelte adapter.
4. Keep project-specific copy, data mapping and CSS local.
5. Test keyboard interaction, focus restoration, form submission and teardown.

Do not copy project-specific selectors or styles into this repository. Add stable `data-part` hooks when an adapter needs a new styling surface.
