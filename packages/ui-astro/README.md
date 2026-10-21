# @ooopsstudio/ui-astro

Astro 7 semantic markup and component-specific progressive enhancement over `@ooopsstudio/ui-primitives`.

```sh
pnpm add @ooopsstudio/ui-astro @ooopsstudio/ui-primitives @ooopsstudio/accessibility
```

```astro
---
import Combobox from '@ooopsstudio/ui-astro/Combobox.astro';
import '@ooopsstudio/ui-astro/base.css';
const options = [{value: 'gr', label: 'Greece'}];
---
<Combobox id="country" name="country" label="Country" {options} clearable />
```

Components: Button, IconButton, DatePicker, DateRange, Drawer, Field, Input, Textarea, Checkbox, RadioGroup, Switch, Select, Combobox, MultiSelect, DropdownMenu, Tooltip, Tabs, Accordion, Slider, NumberInput, SegmentedControl, Dialog, Modal and Popover.

Built-in copy and accessible default labels can be overridden through serializable `messages` on existing controls; calendar controls expose individual label/help/error props. `Field` uses `${id}-control` as its default control ID; pass `controlId` when the slotted form control uses another ID.

Each component imports only its installer. Installers are idempotent, remove listeners on Astro view transitions and mount again on `astro:page-load`. `Part.astro` is the low-level compound-markup escape hatch for custom Root, Trigger, Content, Item, Group, Label and Indicator structures while retaining standard `data-part`/state attributes.

`base.css` contains only structural accessibility/layer rules. Project themes should target `data-part`, `data-state`, `data-orientation`, `data-disabled`, `data-invalid`, `data-selected`, `data-active`, `data-placement` and the runtime geometry variables.

Astro props are serializable. Use `@ooopsstudio/ui-primitives` directly when custom functions, async loaders or Standard Schema validators must be supplied at runtime.

## License

MIT

See [consumer contracts and migration](../../docs/consumer-contracts.md) for native forwarding, Field associations, adapter defaults, layer composition and reactive options.

### Button and IconButton

Import `@ooopsstudio/ui-astro/Button.astro` or `IconButton.astro`. Button renders a native button (safe default `type="button"`) or an anchor when `href` is present. Native form/link attributes are forwarded. `disabled`/`loading` are safe in SSR without JavaScript: buttons are disabled and unavailable links have no href, expose `aria-disabled`, and are removed from the tab order. Loading preserves the label and adds `aria-busy`; a named `loading` slot can contain a decorative indicator.

Client enhancement uses the shared button controller to guard synthetic as well as normal activation and cleans up through Astro's view-transition lifecycle. Server props are snapshots; rerender/remount to change them, or use `createButtonController` for imperative ownership. Native IDs provide DOM refs. Use `anchorId` to compose with Popover/DropdownMenu. `installButton` is also exported from `@ooopsstudio/ui-astro/runtime/actions`.

IconButton requires a nonempty `label` and renders its default slot as a decorative icon. Neither component imposes a visual theme.

```astro
<Button type="submit" form="record" loading={saving}>Save changes</Button>
<Button href="/documents" disabled={unavailable}>Documents</Button>
<IconButton label="Refresh results">↻</IconButton>
```

### DatePicker and DateRange

Import `DatePicker.astro` or `DateRange.astro`. Both require `id` and `label`. Values are ISO calendar dates (`YYYY-MM-DD`), not timestamps: a string for DatePicker, `{start, end}` for DateRange. Native date inputs work without JavaScript and support `name`, `form`, `required`, `disabled`, `readOnly`, `min`/`max`. A range's `name="trip"` produces `trip-start`/`trip-end`; `startName`/`endName` override these names.

Progressive enhancement adds a modal calendar sharing the same headless model as Svelte. It handles keyboard navigation, bounds, ordering reverse range clicks, partial-range validation, associated errors, native reset (including cancelled reset), Escape and focus restoration. `disabledDates` is a serializable list of unavailable ISO dates; a range cannot cross one. `locale` defaults to `en`, `firstDayOfWeek` to Monday (`1`), and `dir` follows its context unless supplied. Calendar/start/end/navigation/close/help/error text can be customized with label props. `describedBy` associates external help.

Selections emit native bubbling input/change events and `ooops:date-change` with `detail.value` (string or range). Reset and initial mounting are silent. Installers are idempotent and clean up on ClientRouter transitions; props are server snapshots. Import `installCalendar` from `@ooopsstudio/ui-astro/runtime/calendar` for manually owned roots.

```astro
<DatePicker id="event-date" label="Event date" name="date" value="2026-10-21" />
<DateRange id="travel" label="Travel dates" name="trip" disabledDates={['2026-10-25']} />
```

### Drawer

`Drawer.astro` wraps Modal, forwarding its title/description, focus IDs, busy/dismissal options, trigger and body/footer slots. `side` accepts logical `start`/`end` (default `end`) or `top`/`bottom`. Import `base.css` for edge geometry, scrolling body and persistent footer; use `--ooops-ui-drawer-size` and consumer surface styles. Cancellable `ooops:before-close` and `ooops:modal-close` events retain the existing Modal contracts.

```astro
<Drawer id="details" title="Details" triggerLabel="Open details" side="end">
  <p>Editor content</p><p slot="footer">Persistent actions</p>
</Drawer>
```


### Consumer styling

Every public UI component accepts `parts`, a serializable map of part names to `{class, style}`. Classes are merged with existing component classes; inline CSS declarations are appended after existing native string styles. This applies to SSR, hydration, portaled panels and regenerated options/chips/days. In Svelte the map is reactive. A child component owns its own parts; parent styles do not silently target nested components.

```js
const parts = {
  root: {class: 'product-field'},
  trigger: {class: 'product-trigger', style: 'border-radius: 12px'},
  day: {class: 'product-day', style: '--day-size: 2.5rem'},
  'calendar-dialog': {style: 'background: var(--surface); color: var(--text)'}
}
```

Pass `parts={parts}` to the component. Target its classes or `data-part` and ARIA/state selectors in consumer CSS. `base.css` is optional and sits in `@layer ooops-ui`; ordinary unlayered product CSS takes precedence without `!important`. Existing `class` and native attribute contracts are preserved. Full part names and overlay styling guidance are in `docs/styling.md`. Styling does not replace semantic attributes, focus handling or native hidden state.

### Workspace calendar features

`DatePicker` and `DateRange` accept `mode="date"` (default) or `mode="datetime"`. Datetime values are local ISO `YYYY-MM-DDTHH:mm`, without implicit UTC conversion. `timeStepMinutes` defaults to 15; `defaultTime` can supply a deterministic initial time, otherwise selection rounds the current local time up to the next step. Both endpoints of a range retain their own time. Date and datetime min/max, disabled dates, readonly/disabled, required, form association and reset remain supported.

`dateFormat` is `native` by default, or `DD-MM-YYYY`, `MM-DD-YYYY`, `YYYY-MM-DD`. `spacedSeparators` adds the Workspace-style ` - ` separators. Display formatting never changes canonical form values. Formatted inputs progressively enhance native date/datetime inputs; without JavaScript the native inputs remain usable. `placeholder`, `timeLabel`, `clearLabel`, `monthLabel`, `yearLabel` and existing help/error labels are configurable. `clearable` defaults to true. Direct month and year controls avoid repeated arrow navigation; `minYear`/`maxYear` default to 1/9999 and configured date bounds still clamp navigation. Cookie storage and product variants remain consumer concerns.

Calendar named slots: `calendar-icon`, `previous-icon`, `next-icon`, `clear-icon`, `close-icon`, `day`. The day slot is an inert template cloned when navigating months; put `data-calendar-day-number` on a text element to receive each day number. Do not use duplicate IDs or interactive descendants inside the day template. The button keeps its ISO `data-date`, accessible date label and state.

The month picker uses the shared custom DropdownMenu, not an OS-rendered select popup. Its nested styling map is `monthParts` (the DropdownMenu part names: `root`, `trigger`, `content`, `item`, `indicator`, etc.). It remains inside the calendar dialog and uses the existing menu controller for keyboard/focus behavior.
