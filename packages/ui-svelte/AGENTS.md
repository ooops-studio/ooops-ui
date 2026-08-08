# UI Svelte Adapter Guidance

- Wrap `ui-primitives` rather than duplicating controller state in Svelte reactivity.
- Preserve component accessibility contracts and test interaction through rendered Svelte components.
- Keep styles optional/token-based and do not grow Select into Combobox behavior.
- Exercise bindings, snippets, SSR hydration, reactive updates and teardown in the SvelteKit E2E fixture for lifecycle changes.
