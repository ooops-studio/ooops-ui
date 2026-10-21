# @ooopsstudio/ui-svelte

Svelte 5 adapters over the shared `@ooopsstudio/ui-primitives` controllers.

```sh
pnpm add @ooopsstudio/ui-svelte @ooopsstudio/ui-primitives @ooopsstudio/accessibility
```

```svelte
<script lang="ts">
  import {Combobox} from '@ooopsstudio/ui-svelte';
  import '@ooopsstudio/ui-svelte/base.css';
  let value = $state('');
</script>

<Combobox id="country" name="country" options={[{value: 'gr', label: 'Greece'}]} bind:value />
```

Components: Button, IconButton, DatePicker, DateRange, Drawer, Field, Input, Textarea, Checkbox, RadioGroup, Switch, Select, Combobox, MultiSelect, DropdownMenu, Tooltip, Tabs, Accordion, Slider, NumberInput, SegmentedControl, Dialog, Modal and Popover.

Built-in copy and accessible default labels can be overridden through `messages` on existing controls; calendar controls expose individual label/help/error props. `Field` uses `${id}-control` as its default control ID; pass `controlId` when the child form control uses another ID.

Values/open state are bindable where relevant. Snippets customize trigger, option, chip, item, tab, panel and indicator markup. `Part` provides a low-level compound-markup escape hatch with the same state attributes. The optional `base.css` contains structural rules only; visual tokens and component styling remain local to the product.

Input and Textarea emit `onChange` once per native edit, including edits after parent value updates; parent updates do not emit it. Readonly inputs cannot be cleared. Checkbox and Switch render their checked defaults during SSR and preserve native changes made before hydration. Disabled native projections are omitted from `FormData`. RadioGroup and SegmentedControl reset their bindings and native values to the initial selection without emitting a user-change callback. Accordion reacts to `type` and `collapsible` changes; switching to single mode keeps the first open panel and emits the normalized selection when it changes.

Combobox supports local or abortable async options. MultiSelect supports search, removable chips, select-all, clear and maximum selection. DropdownMenu supports checkbox/radio items and nested submenu navigation. Tooltip content is deliberately non-interactive.

## License

MIT

See [consumer contracts and migration](../../docs/consumer-contracts.md) for native forwarding, Field associations, adapter defaults, layer composition and reactive options.

### Button and IconButton

`Button` renders a native button by default (`type="button"`), or an anchor when `href` is supplied. Pass `type="submit"` and native `form`/`name`/`value` props for form submission. Native HTML attributes, ARIA/data attributes and lowercase DOM event handlers are forwarded to the control. Styling remains the consumer's responsibility.

`disabled` and `loading` block activation; native buttons become disabled, while links lose their href and tab stop and expose `aria-disabled`. Loading exposes `aria-busy` and preserves the accessible name. An optional `loadingIndicator` snippet is decorative. `bind:elementRef` receives the actual button/anchor, follows native tag replacement and becomes null on teardown. Changing `href` between null and a string replaces the native element; consumers owning overlays must remount those overlays for the new anchor.

`IconButton` shares these props and requires a nonempty `label`, used as its accessible name. Its children render as a decorative icon. Do not use the icon glyph or a tooltip as the only label.

```svelte
<Button type="submit" form="record" loading={saving}>Save changes</Button>
<Button href="/documents" disabled={unavailable}>Documents</Button>
<IconButton label="Refresh results" onclick={refresh}>↻</IconButton>
```

### DatePicker and DateRange

`DatePicker` binds a `YYYY-MM-DD` string (empty string means no date). `DateRange` binds `{start, end}`. These are Gregorian calendar dates, not time-zone instants. Both require `label`, render editable native date inputs, work without JavaScript, support `form`, `required`, `disabled`, `readOnly`, `min`/`max` and reset to their mounted initial values without emitting a user-change callback. A cancelled form reset preserves the draft. Parent value updates are silent; native edits and calendar selections call `onChange`.

With JavaScript the trigger opens a named modal calendar with one roving day tab stop, arrow/week/month/year navigation, Escape dismissal and opener focus restoration. `locale` formats month/day labels (default `en`); `firstDayOfWeek` defaults to Monday (`1`, Sunday is `0`). `dir` supports RTL. Label/help/error props include `calendarLabel`, `startLabel`, `endLabel`, `previousMonthLabel`, `nextMonthLabel`, `closeLabel`, `keyboardHelp` and `errorMessage`. `describedBy` preserves an external description. `isDateDisabled(date)` marks unavailable dates and prevents ranges crossing them. Native values are validated too.

A range's first selection begins a draft; the second completes it, ordering reverse clicks. A partial or invalid range blocks native submission and exposes its associated error. `name="trip"` produces `trip-start`/`trip-end`; override with `startName`/`endName`.

```svelte
<DatePicker label="Event date" name="date" bind:value min="2026-01-01" />
<DateRange label="Travel dates" name="trip" bind:value={travel} />
```

### Drawer

`Drawer` composes the shared Modal and accepts its bindable `open`, `busy`, close guards, initial/restore focus callbacks, trigger/body/footer snippets and labels. `side` is `end` by default; `start`, `top` and `bottom` are also supported. Inline sides follow writing direction. Import `base.css` for edge placement, a scrolling body and persistent footer. Override `--ooops-ui-drawer-size` (default `28rem`) and style its surface locally. Dismissal, focus trapping, nested layers and teardown use the existing modal controller. No separate dismissal implementation is introduced.

```svelte
<Drawer title="Details" bind:open side="end" beforeClose={() => !unsaved}>
  <p>Editor content</p>
  {#snippet footer()}<Button onclick={save}>Save</Button>{/snippet}
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

Calendar content snippets: `calendarIcon`, `previousIcon`, `nextIcon`, `clearIcon`, `closeIcon`, plus `day(context)` with `{date, day, selected, disabled, outsideMonth}`. They replace content inside library-owned accessible controls; do not render nested interactive elements.

The month picker uses the shared custom DropdownMenu, not an OS-rendered select popup. Its nested styling map is `monthParts` (the DropdownMenu part names: `root`, `trigger`, `content`, `item`, `indicator`, etc.). It remains inside the calendar dialog and uses the existing menu controller for keyboard/focus behavior.

See the [Calendar/Drawer lifecycle and migration contract](../../docs/calendar-and-drawer-contracts.md) for supported live updates, remount policy, form/reset semantics and Workspace preferences.
