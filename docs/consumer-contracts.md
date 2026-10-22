# Consumer contracts and migration

The UI packages own design-neutral behavior. Keep autosave, persistence, routing guards, business validation and product appearance in the consuming application.

## Native inputs and field state

Svelte Input/Textarea forward typed native attributes and lowercase DOM handlers (`oninput`, `onblur`, `onfocus`, `onkeydown`, `onchange`) to the actual input, not its wrapper. `onChange(value)` remains the value callback and runs once per controller edit. Native `onchange(event)` is a separate browser event, typically on commit/blur. Controlled parent updates do not emit value callbacks. `bind:elementRef` provides focus/select/validity access; the reference becomes null on teardown. `class` remains on the wrapper, `value` remains a string, and number parsing belongs to NumberInput. Prefix content is a snippet, not the native RDFa `prefix` attribute.

Astro Input/Textarea forward native HTML attributes. Attach browser event listeners using their explicit control id; functions cannot be serialized through server props. External `aria-describedby` IDs are merged with the component's description and error (or hint). `ariaLabel` is an alias for `aria-label`; native `aria-labelledby` is supported. Other choice/value controls expose `ariaLabel`, `ariaLabelledby`, `ariaDescribedby`. Visible labels remain supported. Svelte RadioGroup does not require a submission name when used only for UI state.

Svelte Field passes the control attributes into its children snippet:

```svelte
<Field id="email" label="Email" description="Where to reply" {error} {pending} required>
  {#snippet children(control)}
    <Input {...control} bind:value onblur={save} />
  {/snippet}
</Field>
```

For Astro, compute `getFieldControlAttributes({id, controlId, description, hint, error, pending, required, disabled})` from `ui-primitives` and spread the returned object onto the control inside Field. Pass the same state to Field. This produces SSR label/control, description/error and busy/invalid associations. Additional external description IDs must be combined with the returned `aria-describedby` if overriding it.

The application owns touched/dirty/pending and async validation. Set an error only for the current value/request; focus the first invalid element using the ref on failed submit; reset application validation state with the form. Field does not start requests or infer validation rules.

## Styling coexistence

Optional structural CSS targets `data-ooops-ui` ownership markers. Generic consumer `data-part`, orientation and hidden attributes are not targeted. Portaled elements retain ownership. Keep the marker if replacing shipped markup using a lower-level controller; do not add it to unrelated application DOM. Data parts remain styling hooks, not unique identifiers. CSS variables such as `--ooops-ui-layer-z` belong on the portal container too when needed.

## Adapter parity

Both adapters default NumberInput `clampOnBlur` to false. Opt into clamping explicitly. Svelte previously used false and Astro previously used true; applications relying on Astro's old default must pass `clampOnBlur`.

Both MultiSelect adapters support `showSelectAll`/`showClear` (default true). Disabled chip removal, select-all and clear are inert. Direct controller `setValues` is still available for programmatic state changes. Astro controls retain their existing id-as-name defaults, including RadioGroup. MultiSelect projects arrays as `name[]` in Svelte; Astro retains its explicit `name` convention. Normalize names in the consuming wrapper; this release does not silently rename submitted fields. Initial/default-value API shapes remain different: Astro can serialize separate defaults; Svelte captures its initial bound value. Markup data parts need not share identical HTML tags.

DropdownMenu renders recursive submenus in both adapters. Svelte synchronizes checkbox/radio state into its local items model before `onSelect` and returns the updated selected item. If the parent owns the model, update it immutably in that callback; explicitly replacing items is authoritative. Radio groups must have distinct group names when their state is independent.

## Layers and dialogs

Svelte Popover/DropdownMenu accept `anchorEl` to use an existing control instead of rendering another button, `portalTarget` for a custom container, and `offset`, `zIndex`, `matchAnchorWidth`. Placement and alignment are also configurable. The library owns expanded/controls/haspopup state while mounted. The external button must have an accessible name. Do not put a button inside the default trigger snippet. Bind `open` for controlled state; `beforeClose(reason)` may synchronously return false. A portal target inside a native dialog keeps overlays within that dialog's top layer.

Astro uses `anchorId` and `portalTargetId` for the same composition. Install lifecycle behavior as usual; cancel the root's cancelable `ooops:before-close` event to veto dismissal. Its detail contains `reason`. Keep referenced elements in the document before mounting. View-transition teardown removes listeners and owned portals.

Svelte Dialog/Modal expose `initialFocus()`/`restoreFocusTo()` getters, `busy` and `beforeClose(reason)`. Astro exposes `initialFocusId`/`restoreFocusId`, `busy` and the same cancelable DOM event. Native `dialog.close()` is also guarded. Use library open/close state rather than removing an open dialog element manually. Async Dialog confirmation locks concurrent confirm/close attempts, keeps errors open, clears the internal busy state and reports `onConfirmError` (Svelte) or `ooops:dialog-error` (DOM). Provide a visible application error message. Teardown cancels ownership/focus behavior; it does not cancel an application's already started network request.

## Tabs

`mode="panels"` has tab semantics and keyboard activation; `mode="navigation"` uses links for items with href and buttons otherwise, with `aria-current`. Items support a text/number `badge`. For external panels set `renderPanels={false}`, supply each item's `panelId` and render those elements with initial `hidden` state and matching `data-value`, `role="tabpanel"`, and `aria-labelledby` pointing at their tab. Panel IDs are `${id}-tab-${item.id}` in Svelte and `${id}-${item.id}-tab` in Astro. The controller owns visibility. Do not create a second copy of the same panel.

## Reactive versus mount-time options

| Component | Reactive Svelte contract | Mount-time configuration |
| --- | --- | --- |
| Input/Textarea | value, native attributes/handlers, label/messages | initial reset value; Textarea resize controller settings |
| Checkbox/Switch | checked, disabled; Checkbox indeterminate | initial reset value |
| RadioGroup/SegmentedControl | value, options, disabled; naming/markup | initial reset value |
| Select | value, options, disabled, allowEmpty | initial reset value, portal ownership |
| Combobox | value, options, disabled, allowCustomValue | loader/debounce, initial reset value |
| MultiSelect | values, options, disabled, maxSelected, action visibility | initial reset value |
| NumberInput | value, min/max/step, clampOnBlur, disabled markup | initial reset value |
| Slider | value, min/max/step, gap, orientation, direction, disabled | initial reset value |
| Accordion | openIds, type, collapsible | root identity |
| Tabs | activeId, items, mode, activation, orientation, loop | renderPanels/external panel ownership |
| Dialog/Modal | open, busy; close guard and focus getters read current props | dismiss flags, root identity, captured `onClose` and Dialog `onConfirm` callbacks |
| DatePicker/DateRange | value, bounds, locale/week start/direction, disabled/readonly, unavailable-date predicate; labels/content/parts | reset baseline, identity/form owner; keyed remount for format/time configuration (see detailed contract) |
| Drawer | Modal open/busy and presentation; side/content/parts | Modal dismissal flags, identity and captured `onClose` callback |
| Popover/DropdownMenu | open; callbacks read current props | anchor identity, portal container, positioning/dismiss flags; menu item structure |

Remount when changing mount-time configuration. Astro server props are snapshots; update via the controller/runtime lifecycle rather than assuming framework reactivity. The table describes supported updates, not permission to replace a live focused DOM owner without teardown.

## Release validation

New regression suites cover native forwarding and callbacks, external labels and Field IDs, disabled actions, CSS coexistence, portal placement, nested menus, veto, async confirmation errors and focus restoration. Run `pnpm validate:release` before publishing; automated axe is not a replacement for a manual screen-reader session. Real Workspace pilots are still required before replacing all wrappers.

The repository build/release toolchain requires Node.js >=22.22.0 because it uses Astro 7.4. The CI matrix includes that minimum and the current Node 22 line.


## Button and IconButton

Both adapters expose native button/link controls. Button defaults to `type="button"`; opt into `submit`/`reset` explicitly. Disabled or loading buttons are native-disabled. Links keep link semantics but lose their href and tab stop while unavailable, including during SSR without JavaScript. Native DOM attributes/events are forwarded and loading keeps the accessible name stable with `aria-busy`. An optional Svelte `loadingIndicator` snippet or Astro `loading` slot is decorative. Visual themes and async application state remain with the consumer.

IconButton requires a nonempty accessible `label` and hides its icon content from the accessibility tree. Svelte supports `bind:elementRef` for both components; it follows button/anchor replacement and becomes null on teardown. When a ref anchors an overlay, mount the overlay after the ref is available and remount it if the native element identity changes. Astro uses native IDs and progressive enhancement through `runtime/actions`. Its server props require rerender/remount; they are not reactive.
## Calendar controls and drawers

The [detailed Calendar/Drawer contract](calendar-and-drawer-contracts.md) specifies live updates versus remounts, submitted names, datetime/format defaults, reset ownership, Astro events, styling and Workspace preference mapping.

DatePicker/DateRange share the Gregorian calendar model in `ui-primitives`. ISO values preserve dates across time zones; native inputs remain the no-JavaScript form fallback. Calendar selection and typed input share bounds/unavailable-date validation. Partial ranges are invalid; reverse selections are ordered and cannot cross disabled dates. Reset restores initial form values after the native reset action, respects cancellation by later listeners, and cancels deferred work on teardown.

Calendar labels and help/error text are explicit props, independently of locale-based date formatting. The calendar uses a named modal, one roving grid tab stop, full weekday names, month announcements, arrow/Home/End/Page Up/Page Down navigation and Escape/focus restoration. Automated role/axe checks are recorded separately from manual screen-reader evidence.

Drawer delegates behavior to Modal and adds only logical edge placement plus scrolling-body/footer geometry in optional `base.css`. It accepts the existing close guard and busy contracts. Its `start`/`end` placement respects RTL. Surface colors, borders, animation and branding belong to the consumer.

## Searchable entity picker (Svelte)

`SearchableMultiSelect` supports controlled values/options, disabled state, selected-result filtering and a result limit. Stored IDs absent from options are preserved without emitting a change. Selection emits `onAdd`/`onRemove` and then `onChange` exactly once. Creation invokes only `onCreate(query)` and leaves persistence/dialog ownership with the application. The native input keeps spaces and IME composition intact; option buttons receive real keyboard focus. `restoreFocusOnRemove=false` preserves applications that leave chip-removal focus to native behavior. Default rendering submits repeated `name` values, omits disabled inputs and resets to the initial bound values without user-change callbacks. Headless rendering owns its form projection; the component still attaches reset handling through the supplied input reference. Use `clearQuery()` after a successful asynchronous creation. Astro has no adapter for this new entity-picker contract in this release.
