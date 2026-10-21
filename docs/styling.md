# Consumer styling contract

All public Astro/Svelte UI components accept `parts?: UiParts`, with `{class?: string, style?: string}` per named part. Part classes/styles are applied to the actual owned element, not a guessed descendant selector. This remains true for portals and runtime-rendered content. Use the same map in both adapters. Class names are additive; CSS strings are appended so explicit consumer declarations win. Names are CSS hooks, not IDs. Component content remains customizable through its existing snippets/slots and lower-level primitives.

`base.css` is optional and uses the `ooops-ui` cascade layer. Product CSS can override colors, typography, spacing, geometry, borders, states, indicator appearance, animation and responsive layout. Scope selectors using your supplied class, especially for portaled content; a descendant selector of the original root cannot reach a panel moved to another container. CSS variables needed in that panel can be set directly with `parts.panel.style` (or `listbox`, `content`, `dialog` as appropriate). Use overlay placement/offset/zIndex/portalTarget props for controller-owned positioning. Native platform popups retain browser/OS rendering; calendar custom surfaces and custom selection controls expose their DOM parts.

Hidden state, focusability, ARIA and disabled interactions remain behavior contracts. The `parts` map intentionally cannot replace events or semantic attributes. Keep visible focus indicators and sufficient contrast when providing a theme. Native attributes still belong on controls according to existing component contracts, while `parts` always addresses the named owned element. For Button/IconButton use `button`, rather than `root`, to target the actual anchor/button. A nested component must receive its own `parts` map.

## Svelte parts

| Component | Part names |
|---|---|
| Accordion | `heading`, `indicator`, `item`, `panel`, `root`, `trigger` |
| Button | `button`, `loading-indicator` |
| Checkbox | `control`, `description`, `error`, `indicator`, `label`, `root` |
| Combobox | `clear`, `control`, `description`, `empty`, `error`, `indicator`, `input`, `label`, `listbox`, `loading`, `native-input`, `option`, `option-description`, `option-label`, `root` |
| DatePicker | `calendar-dialog`, `calendar-header`, `clear`, `close`, `date-input`, `day`, `day-cell`, `display-input`, `error`, `grid`, `help`, `input-label`, `label`, `month-controls`, `month-title`, `next`, `previous`, `root`, `surface`, `time-input`, `trigger`, `week`, `weekday`, `weekdays`, `weeks`, `year-input` |
| DateRange | `calendar-dialog`, `calendar-header`, `clear`, `close`, `date-input`, `day`, `day-cell`, `display-input`, `error`, `grid`, `help`, `input-label`, `label`, `month-controls`, `month-title`, `next`, `previous`, `root`, `surface`, `time-input`, `trigger`, `week`, `weekday`, `weekdays`, `weeks`, `year-input` |
| Dialog | `body`, `cancel`, `confirm`, `description`, `dialog`, `footer`, `header`, `root`, `surface`, `title`, `trigger` |
| Drawer | `body`, `close`, `description`, `dialog`, `footer`, `header`, `root`, `surface`, `title`, `trigger` |
| DropdownMenu | `content`, `indicator`, `item`, `item-wrapper`, `label`, `root`, `separator`, `submenu-content`, `submenu-group`, `submenu-trigger`, `trigger` |
| Field | `control`, `description`, `error`, `hint`, `label`, `root`, `text` |
| IconButton | `button`, `icon`, `loading-indicator` |
| Input | `clear`, `control`, `description`, `error`, `hint`, `input-shell`, `label`, `prefix`, `reveal`, `root`, `suffix` |
| Modal | `body`, `close`, `description`, `dialog`, `footer`, `header`, `root`, `surface`, `title`, `trigger` |
| MultiSelect | `actions`, `chip`, `chip-remove`, `chips`, `clear`, `control`, `empty`, `indicator`, `input`, `label`, `listbox`, `native-input`, `option`, `root`, `select-all` |
| NumberInput | `control`, `decrement`, `increment`, `input`, `label`, `root` |
| Part | `caller-supplied part name` |
| Popover | `panel`, `root`, `trigger` |
| RadioGroup | `control`, `description`, `indicator`, `label`, `option`, `root`, `text` |
| SegmentedControl | `input`, `option`, `root` |
| Select | `description`, `error`, `group-label`, `indicator`, `label`, `listbox`, `native-select`, `option`, `option-copy`, `option-icon`, `option-image`, `root`, `small`, `text`, `trigger`, `value` |
| Slider | `field-root`, `input`, `label`, `range`, `root`, `thumb`, `track` |
| Switch | `control`, `description`, `label`, `root`, `switch-label`, `thumb`, `track` |
| Tabs | `badge`, `indicator`, `list`, `panel`, `root`, `tab` |
| Textarea | `control`, `counter`, `description`, `error`, `hint`, `label`, `root` |
| Tooltip | `arrow`, `content`, `trigger` |

Astro uses the same semantic hooks; also inspect `data-part` for adapter-specific wrappers such as `options`. Dropdown menu dynamic items use `submenu-group`, `item-wrapper`, `submenu-trigger`, `submenu-content`; options/chips are restyled when regenerated. `Part` accepts an arbitrary caller-owned part name. `Drawer` forwards styling to Modal. Calendar `day` styling is retained after month/year navigation.

## Example

```svelte
<DatePicker label="Date" dateFormat="DD-MM-YYYY" parts={{
  root: {class: 'date-field'},
  'calendar-dialog': {class: 'date-calendar'},
  day: {class: 'date-day'},
  previous: {style: 'color: var(--accent)'}
}} />
```

```css
.date-calendar { background: #142b40; color: white; border-radius: 20px; }
.date-day { border: 0; border-radius: 50%; padding: .5rem; }
.date-day[aria-disabled=true] { opacity: .35; }
[data-part=day-cell][aria-selected=true] .date-day { background: #d8e8ff; color: #142b40; }
.date-day:focus-visible { outline: 3px solid #ffbf47; }
```

Calendar content can also be replaced with Svelte snippets or Astro named slots. The library retains accessible labels and interactions on the outer controls. Do not add interactive children inside those buttons.

Calendar month menus expose a separate `monthParts` map using the shared DropdownMenu parts. This allows independent styling of the date trigger and month trigger/menu.

If product styles also use cascade layers, declare their ordering before importing styles, for example `@layer ooops-ui, product;`. Unlayered product rules naturally outrank the optional library layer.
