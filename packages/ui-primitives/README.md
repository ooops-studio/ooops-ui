# @ooopsstudio/ui-primitives

Choice controllers synchronize native form resets without emitting user-change callbacks and cancel pending reset work on teardown. Accordion controllers expose `configure({type, collapsible})`; changing to single mode normalizes the open IDs and emits a change only when normalization changes the selection.

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
- Notifications: `createToastStackController` (queue/lifetime; host-rendered content).

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

Install `@ooopsstudio/ui-editor-manifests` when these controls need to be exposed to Ooops Editor. Editor metadata is deliberately shipped by that optional adapter package, so this core controller package has no editor-contract dependency.

## Scope

The primitives own behavior, not application copy, visual design or CMS data. Combobox does not virtualize. MultiSelect does not create free-form tags. Tooltip content must remain non-interactive; use Popover for interactive content.

## License

MIT

See [consumer contracts and migration](../../docs/consumer-contracts.md) for native forwarding, Field associations, adapter defaults, layer composition and reactive options.

### Searchable entity multi select

`createSearchableMultiSelectController` provides inline entity search with multiple selected IDs, rich `SelectOption` records, custom filtering, `hideSelected`, result `limit`, disabled guards, per-item add/remove callbacks and an optional create action. It preserves selected IDs absent from the current records. The event methods keep actual keyboard focus on option buttons; adapters provide root/input/option getters and wire the returned input, list and focusout handlers. No framework, DOM markup or product styles are included. Call `configure` for controlled updates and `destroy` on teardown to invalidate pending focus work and subscriptions.

### Modal focus scopes and owned portals

`createModalFocusController` coordinates modal stacking, Tab containment, background isolation and restoration of replaced or removed openers. It exposes `setOpen`, `handleKeydown`, `handleFocusin`, `isActive`, `isTop` and `destroy`; headless hosts route events and rendering through that single owner. `createFocusTrap({modal: true, ...})` uses this same scope and installs its listeners automatically. `createDialogController` uses the shared trap.

Register an external floating surface with `registerModalFocusPortal(portal, owner)` and call the returned disposer during cleanup. Ownership can pass through another registered portal. The registration keeps only surfaces owned by the active modal outside background isolation; it also permits focus within those surfaces. The layer controller registers and releases its own surfaces automatically.

`createNonModalFocusController` is a separate contract for non-modal drawers. It does not trap Tab, isolate background content or install global dismissal listeners. Opening focus and restoration default to off; opt in with `focusOnOpen: true` when the product flow calls for them. Route `handleKeydown` only from the drawer's own content. This contract does not make a drawer modal or assign `aria-modal`.

Tooltip controllers keep hoverable content available until both pointer and focus have left, cancel pending opens on Escape, and preserve description IDs owned by other controls. Menu arrows, Home/End and typeahead remain at the active submenu level. Async dialog confirmations belong to a mounted controller lifetime: late resolution or rejection from a destroyed lifetime cannot mutate or close a newly mounted dialog.

Hosts with existing chrome can opt out of layout writes with `createLayerController({positioning: false, manageVisibility: false, ...})`, while the shared layer still owns its stack, outside interactions and Escape. Configure `pointerEventName`, `capturePointer` and `captureEscape` to retain a host's native event phase; dismissal guards receive the originating Event. Owned descendants close with their ancestor even if an opener disappears, while Escape closes one level. Native dialog anchors keep default portals inside that dialog's top-layer boundary.

`createMenuController({activation: 'native', triggerEvents: false, ...})` retains native host click handlers and controlled opening. The controller owns roving focus, arrows, typeahead, Tab exit and submenu keys without toggling host checkbox/radio state or firing a second pointer selection. Inputs and editable content retain their native editing keys.

`createTooltipController` supports lazy host presentation through `onBeforeOpen`/`onOpenChange`, with `positioning: false`, `portal: false` and `describeWhenOpen: true`. `focusMode: 'keyboard'` avoids unsolicited help from a modal's programmatic initial focus; `shouldOpen` can suppress disabled/expanded controls, and `dismissOnInteraction` dismisses activation/scroll/resize. `refresh()` rechecks suppression. Styling, labels and geometry remain the host's responsibility, with a single shared timer/focus/layer owner.

For controlled dialogs, use `closeOnConfirm: false` when the caller decides visibility. `runAction(action, reason)` shares the same busy/duplicate/lifetime guards for cancel or close callbacks, returning false on declined/failed/stale work. `onActionError(error, reason)` handles recoverable action errors; `onConfirmError` remains supported. `manageFocus: false` and `manageVisibility: false` allow an existing host to compose its shared modal or non-modal focus scope without installing a second focus owner. A callback may return false to keep a confirmation open.


### Native sliders and free-text tokens

`createSliderController({nativeInput: () => input, getRoot: () => input, getThumbs: () => [], ...})` observes a native range input without replacing its keyboard or pointer defaults. Use `onInput(value, event)` for continuous updates and `onCommit(value, event)` for native change events. Controlled `setValue` and native form resets are silent. Native mode supports one numeric value and permits equal minimum/maximum bounds. The host owns its initial `defaultValue`, labels and styling.

`createTokenInputController` owns free-text token state, comma/newline paste, configurable delimiter keys, Backspace removal, blur commits and IME composition. It has no option catalogue. Supply `getInput`, controlled `values`, `disabled`, `allowDuplicates`, `delimiters` and `onChange`; render chips, remove buttons and hidden form fields in the host. `add`, `remove`, `setQuery` and `setValues` support host actions. `remove(value)` removes matching occurrences; allowed duplicates require distinct render keys. Native form reset restores the initial token list and emits only if it changes. Call `configure` for updates and `destroy` for listener/timer cleanup.

### Color value and editing controller

`createColorPickerController({value, disabled, fallbackValue, onChange})` owns normalized six-digit HEX values, an independent draft, RGB/HSV projections, keyboard steps and captured pointer interaction. It does not render controls, resolve CSS variables, choose presets, or own an overlay. Compose the host's existing Popover and Button controllers; retain product styles and accessible labels in the host.

`setValue(value, {preserveDraft})` and `configure({value, disabled})` are silent controlled updates. `setDraft`, `resetDraft` and `commit` separate editing from accepted changes; invalid drafts remain available for correction. Accepted commits invoke `onChange` once, including explicit selection of the current color. The neutral fallback is black; a host can supply another valid fallback or resolve its own tokens before passing values.

Wire `handlePlaneKeyDown`, `handleHueKeyDown`, `handleHexKeyDown`, the corresponding `handlePlanePointerDown/Move` and `handleHuePointerDown/Move`, and `handlePointerEnd` for pointerup, pointercancel and lostpointercapture. The plane clamps saturation/brightness; hue keyboard movement wraps. Disabled and composing controls do not commit. Call `cancelPointer()` when closing a floating surface and `destroy()` on teardown to release capture and subscribers. A nonprimary pointer, foreign pointer, missing/zero-sized surface or nonfinite coordinate cannot edit the value.

`normalizeHexColor`, `colorHexToRgb`, `colorRgbToHex`, `colorRgbToHsv`, `colorHsvToRgb` and `colorHsvToHex` are available separately. Numeric conversion rejects nonfinite channels, clamps RGB/saturation/brightness and wraps hue. Hosts retain form projection and the timing of native input/change notifications.

## Toast queue and lifetimes

`createToastStackController<Value>({defaultDurationMs, minimumDurationMs, deferIntervalMs, shouldDeferExpiry, onDismiss})`
exposes `getState`, `subscribe`, `push(value, {durationMs})`, `dismiss(id)`, `clear()` and `destroy()`.
State contains immutable ordered `items: {id, value}[]`; IDs are monotonic within an owner.
Payloads are caller-owned: the controller does not deep-clone application data or impose severity, copy, deduplication or a theme.

The default duration is `null` (persistent); an explicit `null` also overrides a finite default.
Finite durations are clamped to the configured minimum (default zero). Durations must be between zero and
2147483647 milliseconds. A zero duration expires on a future timer task. `shouldDeferExpiry` is checked
at each deadline: when true, the deadline is rechecked after `deferIntervalMs` (default 200, positive),
without resetting or extending other messages. Hosts can use this hook to protect the entire stack
while a user focuses a close control. No DOM listeners, globals, portals, styling or focus traps are installed.

`onDismiss(item, reason)` runs after state publication with `manual`, `timeout` or `clear`.
A host that renders synchronously should capture its active element before mutating DOM if it needs focus recovery.
`clear()` removes its current snapshot and cancels those timers; new messages enqueued by callbacks survive.
`destroy()` cancels timers, clears state/subscribers and prevents late actions without firing dismissal callbacks.
Hosts retain live-region semantics, keyed rendering, Escape policy, focus restoration and product event integration.
