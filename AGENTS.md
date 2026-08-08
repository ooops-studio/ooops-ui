# UI Packages Guidance

## Scope

This monorepo owns design-neutral, accessible UI behavior. `ui-primitives` is the single source of truth for interaction controllers; Astro and Svelte packages are adapters.

## Required workflow

- Run `pnpm -w validate` before public changes and targeted package tests while developing. Run `pnpm -w validate:release` before publishing adapter changes.
- Add controller unit tests for state/keyboard/focus changes and adapter integration tests for rendered behavior.
- Validate packaged exports after changing framework adapters or peer dependencies.

## Architecture

- Use `ui-primitives` for Select, Dialog, Modal, Popover and focus-trap behavior. Adapters must not fork controllers.
- Keep components unstyled or token-based; project styling belongs in consuming applications.
- Preserve progressive enhancement, keyboard access, focus restoration, Escape/outside interaction rules and accessible labels.
- Keep the Astro and SvelteKit fixture applications representative of every shipped adapter component. Behavior changes require adapter E2E coverage and axe checks where semantics change.

## Avoid

- Do not substitute native-only Select behavior where the custom selectable/stylable control is required.
- Do not add Combobox/autocomplete behavior to Select; it is a separate future primitive.
- Do not couple primitives to Astro, Svelte, CSS frameworks or application state.
