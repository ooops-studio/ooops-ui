import {copyFile, mkdir} from 'node:fs/promises'

await mkdir(new URL('../dist', import.meta.url), {recursive: true})

for (const file of [
	'Select.astro', 'Dialog.astro', 'Modal.astro', 'Popover.astro',
	'Field.astro', 'Input.astro', 'Textarea.astro', 'Checkbox.astro', 'RadioGroup.astro',
	'Switch.astro', 'Combobox.astro', 'MultiSelect.astro', 'DropdownMenu.astro', 'Tooltip.astro',
	'Tabs.astro', 'Accordion.astro', 'Slider.astro', 'NumberInput.astro', 'SegmentedControl.astro',
	'Part.astro',
	'base.css'
]) {
	await copyFile(new URL(`../src/${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url))
}
