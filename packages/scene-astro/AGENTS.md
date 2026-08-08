# Scene Astro Guidance

- Keep this adapter independent of Three.js and scene implementation details.
- Preserve explicit registration, safe config serialization and Astro transition cleanup.
- Meaningful scenes require a description, fallback poster and user pause control.
- Test SSR semantics and real browser remount behavior; do not add arbitrary runtime imports.
