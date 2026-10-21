# @ooopsstudio/ui-svelte

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
