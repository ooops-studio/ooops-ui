# @ooopsstudio/ui-astro

## 0.2.0

### Minor Changes

- [`edb8968`](https://github.com/ooops-studio/ooops-ui/commit/edb8968c77e2c8bc37bcd8289a4ff1fd64092415) Thanks [@italiour](https://github.com/italiour)! - Add shared localizable UI messages across the Astro and Svelte component APIs, expose the message helpers from `ui-primitives`, and align Field, Switch, Checkbox, Slider, and Tooltip accessibility contracts.

  Add reactive controller APIs for Select, Combobox, MultiSelect, NumberInput, Slider, and Tabs; reject invalid numeric configurations; prevent disabled sliders from mutating; and invalidate values removed from dynamic option collections.

  Bring the Svelte adapter to Astro parity with readonly and native constraint props, Popover outside-focus behavior, required Switch support, reactive collection updates, and accessible range-thumb names. Update the accessibility dependency, add packed Astro and Svelte consumer builds, and expand cross-browser, visual, stress, mutation, and unit regression coverage.

### Patch Changes

- Updated dependencies [[`edb8968`](https://github.com/ooops-studio/ooops-ui/commit/edb8968c77e2c8bc37bcd8289a4ff1fd64092415)]:
  - @ooopsstudio/ui-primitives@0.2.0

## 0.1.0

- Initial Astro 7 components and progressive-enhancement installers for the Ooops UI primitives.
