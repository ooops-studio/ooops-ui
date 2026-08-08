import {copyFile, readdir, rm} from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const entries = await readdir(dist)

await Promise.all(
  entries
    .filter((entry) => entry.includes('.test.'))
    .map((entry) => rm(new URL(entry, dist), {force: true})),
)

for (const component of [
  'Accordion', 'Checkbox', 'Combobox', 'Dialog', 'DropdownMenu', 'Field', 'Input',
  'Modal', 'MultiSelect', 'NumberInput', 'Part', 'Popover', 'RadioGroup', 'SegmentedControl',
  'Select', 'Slider', 'Switch', 'Tabs', 'Textarea', 'Tooltip',
]) {
  await copyFile(
    new URL(`${component}.svelte.d.ts`, dist),
    new URL(`${component}.d.svelte.ts`, dist),
  )
}
