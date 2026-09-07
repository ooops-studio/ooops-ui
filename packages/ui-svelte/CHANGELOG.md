# @ooopsstudio/ui-svelte

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
