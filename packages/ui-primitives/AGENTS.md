# UI Primitives Guidance

- Keep controllers framework-agnostic, deterministic and side-effect-light. This is the only home for shared interaction behavior.
- Test state transitions, keyboard navigation, focus management, dismiss behavior and cleanup for every interaction change.
- Do not add DOM markup, framework imports or visual styles. Keep Combobox/autocomplete separate from Select.
