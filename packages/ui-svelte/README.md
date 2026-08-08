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

Components: Field, Input, Textarea, Checkbox, RadioGroup, Switch, Select, Combobox, MultiSelect, DropdownMenu, Tooltip, Tabs, Accordion, Slider, NumberInput, SegmentedControl, Dialog, Modal and Popover.

Values/open state are bindable where relevant. Snippets customize trigger, option, chip, item, tab, panel and indicator markup. `Part` provides a low-level compound-markup escape hatch with the same state attributes. The optional `base.css` contains structural rules only; visual tokens and component styling remain local to the product.

Combobox supports local or abortable async options. MultiSelect supports search, removable chips, select-all, clear and maximum selection. DropdownMenu supports checkbox/radio items and nested submenu navigation. Tooltip content is deliberately non-interactive.

## License

MIT
