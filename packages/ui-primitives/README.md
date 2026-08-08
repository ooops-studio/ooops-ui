# @ooopsstudio/ui-primitives

Framework-neutral state, validation, form projection, keyboard behavior and layers for accessible custom controls. The package has no visual theme and reuses the canonical focus trap from `@ooopsstudio/accessibility`.

## Install

```sh
pnpm add @ooopsstudio/ui-primitives @ooopsstudio/accessibility
```

## Public controllers

- Forms: `createFieldController`, `createFormController`, `createInputController`, `createTextareaController`.
- Choices: `createCheckboxController`, `createRadioGroupController`, `createSwitchController`, `createSegmentedControlController`.
- Collections: `createSelectController`, `createComboboxController`, `createMultiSelectController`, `createMenuController`.
- Navigation: `createTabsController`, `createAccordionController`.
- Values: `createSliderController`, `createNumberInputController`.
- Layers: `createLayerController`, `createPopoverController`, `createTooltipController`, `createDialogController`.

Controllers expose immutable state snapshots, `subscribe()`, explicit actions and deterministic `destroy()`. Interactive form controls support controlled/default state, reset and native or hidden form projection. Field validation supports sync/async rules and structurally typed Standard Schema validators.

## Usage

```ts
const field = createFieldController({
  value: '',
  validateOn: ['blur', 'submit'],
  rules: [(value) => value ? null : {code: 'required', message: 'Required'}],
})
```

## Layer runtime

`createLayerController()` handles portals, a nested layer stack, topmost Escape, outside pointer/focus dismissal, focus restoration hooks, collision flip/shift, RTL, resize/scroll and `VisualViewport` updates. Dialog focus containment still belongs to `@ooopsstudio/accessibility`.

## Editor manifests

Import `uiComponentManifests` from `@ooopsstudio/ui-primitives/editor`. The explicit subpath keeps editor metadata out of runtime controller bundles. Every v2 manifest uses `@ooopsstudio/editor-contracts` and describes adapters, typed props, slots, events, parts, states, variants, curated styling and controlled positioning capabilities. Root parts expose responsive positioning and semantic z-index choices; runtime-owned listboxes, menus, tooltips, dialogs, modals and popovers keep their internal layer positioning locked. It contains no project colors, fake CSS tokens or theme defaults.

## Scope

The primitives own behavior, not application copy, visual design or CMS data. Combobox does not virtualize. MultiSelect does not create free-form tags. Tooltip content must remain non-interactive; use Popover for interactive content.

## License

MIT
