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

Components: Field, Input, Textarea, Checkbox, RadioGroup, Switch, Select, Combobox, MultiSelect, DropdownMenu, Tooltip, Tabs, Accordion, Slider, NumberInput, SegmentedControl, Dialog, Modal and Popover.

All built-in copy and accessible default labels can be overridden through the serializable `messages` prop. `Field` uses `${id}-control` as its default control ID; pass `controlId` when the slotted form control uses another ID.

Each component imports only its installer. Installers are idempotent, remove listeners on Astro view transitions and mount again on `astro:page-load`. `Part.astro` is the low-level compound-markup escape hatch for custom Root, Trigger, Content, Item, Group, Label and Indicator structures while retaining standard `data-part`/state attributes.

`base.css` contains only structural accessibility/layer rules. Project themes should target `data-part`, `data-state`, `data-orientation`, `data-disabled`, `data-invalid`, `data-selected`, `data-active`, `data-placement` and the runtime geometry variables.

Astro props are serializable. Use `@ooopsstudio/ui-primitives` directly when custom functions, async loaders or Standard Schema validators must be supplied at runtime.

## License

MIT
