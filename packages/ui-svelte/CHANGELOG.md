# @ooopsstudio/ui-svelte

## 0.5.1

### Patch Changes

- Expose shared modal focus scopes with owned portal isolation and an explicit non-modal focus contract. Fix hoverable tooltip lifecycle, pending Escape, cleanup and ARIA description ownership; constrain submenu navigation to its own menu level and honor initially open menus. Ignore stale async confirmation completions after teardown or remount. Keep Svelte dialog/drawer callbacks and dismissal policies current without remounting an active modal.

  Add headless host contracts for existing geometry/visibility and native menu actions, preserve modal-native portal boundaries, and coordinate dismissal across owned layer branches. Expose controlled async dialog actions and Astro confirmation requests with waitUntil, busy state, cancellation and recoverable failures.
- Updated dependencies []:
  - @ooopsstudio/ui-primitives@0.7.0

## 0.5.0

### Minor Changes

- Add a searchable entity multiselect controller and Svelte adapter with optional headless rendering, custom option content, creation actions, selected chips, per-item callbacks, selected-result filtering and preserved unavailable IDs. Share search, keyboard navigation, disabled handling, focus restoration and lifecycle cleanup without imposing product styles.

### Patch Changes

- Updated dependencies [`cb66df6`]:
  - @ooopsstudio/ui-primitives@0.6.0

## 0.4.0

### Minor Changes

- [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01) Thanks [@italiour](https://github.com/italiour)! - Add shared Button and IconButton adapters with safe native form defaults, button/link semantics, disabled and loading guards, native attributes/events, accessible icon labels, progressive enhancement and Svelte element refs. Add branch execution evidence, SSR/no-JavaScript, keyboard and form regression coverage.

- [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01) Thanks [@italiour](https://github.com/italiour)! - Add a shared Gregorian calendar controller and DatePicker/DateRange adapters with ISO date values, native form fallback, bounds, unavailable dates, range validation, keyboard navigation and modal focus restoration.

- [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01) Thanks [@italiour](https://github.com/italiour)! - Add Workspace-compatible date formats, local datetime values with time steps, clear controls, direct month/year navigation and customizable calendar content. Provide a consistent consumer-owned parts class/style API across all UI components, including portals and dynamically rendered options/chips. Place optional structural CSS in a low-priority cascade layer.

  Fix nested layer Escape handling so a menu inside a dialog closes alone regardless of controller mount order, with permanent regression tests.

- [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01) Thanks [@italiour](https://github.com/italiour)! - Add a Drawer with logical edge placement, a scrolling body and persistent footer, using the shared modal focus, dismissal and busy-state behavior.

### Patch Changes

- Updated dependencies [[`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01), [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01), [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01), [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01)]:
  - @ooopsstudio/ui-primitives@0.5.0

## 0.3.0

### Minor Changes

- Complete consumer contracts before Workspace adoption: guard disabled MultiSelect actions, forward native text-control attributes/events and refs, expose external accessible naming and Field attributes, scope optional structural CSS to owned elements, align numeric/action defaults, support recursive menus and external Tabs panels, and expose external layer anchors, custom portals, focus targets and guarded dialog dismissal. Lock concurrent async confirmations and report failures without closing. Add controller, adapter and cross-browser regressions.

  Astro NumberInput now defaults clampOnBlur to false, matching Svelte; pass clampOnBlur explicitly to retain prior clamping. See the consumer contracts document for mount-time options and migration guidance.

### Patch Changes

- Fix control state consistency before migrating project-local UI: emit text edits once after parent updates, project checked defaults during SSR and preserve pre-hydration native edits, omit disabled hidden values from form submissions, prevent readonly clears, synchronize choice resets, and support reactive accordion configuration. Add controller, adapter, SSR/no-JavaScript and cross-browser regression coverage.

- Updated dependencies []:
  - @ooopsstudio/ui-primitives@0.4.0

## 0.2.1

### Patch Changes

- [`8abcd3e`](https://github.com/ooops-studio/ooops-ui/commit/8abcd3e95ebceef5db62c7feac9f3508f079b1e4) Thanks [@italiour](https://github.com/italiour)! - Move visual-editor metadata into the optional `@ooopsstudio/ui-editor-manifests` package, decouple scene runtimes from editor contracts, and preserve controlled Svelte input values without duplicate change notifications.

- Updated dependencies [[`8abcd3e`](https://github.com/ooops-studio/ooops-ui/commit/8abcd3e95ebceef5db62c7feac9f3508f079b1e4)]:
  - @ooopsstudio/ui-primitives@0.3.0

## 0.2.0

### Minor Changes

- [`edb8968`](https://github.com/ooops-studio/ooops-ui/commit/edb8968c77e2c8bc37bcd8289a4ff1fd64092415) Thanks [@italiour](https://github.com/italiour)! - Add shared localizable UI messages across the Astro and Svelte component APIs, expose the message helpers from `ui-primitives`, and align Field, Switch, Checkbox, Slider, and Tooltip accessibility contracts.

  Add reactive controller APIs for Select, Combobox, MultiSelect, NumberInput, Slider, and Tabs; reject invalid numeric configurations; prevent disabled sliders from mutating; and invalidate values removed from dynamic option collections.

  Bring the Svelte adapter to Astro parity with readonly and native constraint props, Popover outside-focus behavior, required Switch support, reactive collection updates, and accessible range-thumb names. Update the accessibility dependency, add packed Astro and Svelte consumer builds, and expand cross-browser, visual, stress, mutation, and unit regression coverage.

### Patch Changes

- Updated dependencies [[`edb8968`](https://github.com/ooops-studio/ooops-ui/commit/edb8968c77e2c8bc37bcd8289a4ff1fd64092415)]:
  - @ooopsstudio/ui-primitives@0.2.0

## 0.1.1

### Patch Changes

- Publish the UI primitives dependency with a registry-compatible semver range.

## 0.1.0

- Initial Svelte 5 components and bindings for the Ooops UI primitives.
