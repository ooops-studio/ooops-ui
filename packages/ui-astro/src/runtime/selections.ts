import {
	createComboboxController,
	createMultiSelectController,
	formatUiMessage,
	getUiPart,
	type UiParts,
	type SelectOption
} from '@ooopsstudio/ui-primitives'

import {mountUiRoots, readUiConfig} from './shared'

type ComboboxConfig = {
	parts?: UiParts
	id: string
	value?: string
	defaultValue?: string
	options: SelectOption[]
	allowCustomValue?: boolean
	disabled?: boolean
	portal?: boolean
}

function applyPart(element: HTMLElement, parts: UiParts | undefined, part: string) {
	const attributes = getUiPart(parts, part)
	element.dataset.ooopsUi = ''
	if (attributes.class) element.className = attributes.class
	if (attributes.style) element.setAttribute('style', attributes.style)
}

const renderOptions = (
	listbox: HTMLElement,
	options: ReadonlyArray<SelectOption>,
	selected: ReadonlyArray<string> = [],
	parts?: UiParts
) => {
	const host = listbox.querySelector<HTMLElement>('[data-part="options"]') ?? listbox
	host.replaceChildren(
		...options.map((option, index) => {
			const element = document.createElement('div')
			element.id = `${listbox.id}-option-${index}`
			element.role = 'option'
			element.dataset.part = 'option'
			applyPart(element, parts, 'option')
			element.dataset.ooopsUi = ''
			element.dataset.optionIndex = String(index)
			element.dataset.disabled = String(option.disabled === true)
			element.setAttribute('aria-disabled', String(option.disabled === true))
			element.setAttribute('aria-selected', String(selected.includes(option.value)))
			const label = document.createElement('span')
			label.dataset.part = 'option-label'
			applyPart(label, parts, 'option-label')
			label.textContent = option.label
			element.appendChild(label)
			if (option.description) {
				const description = document.createElement('small')
				description.dataset.part = 'option-description'
				applyPart(description, parts, 'option-description')
				description.textContent = option.description
				element.appendChild(description)
			}
			return element
		})
	)
}

const mountCombobox = (root: HTMLElement) => {
	const config = readUiConfig<ComboboxConfig>(root)
	const input = root.querySelector<HTMLInputElement>('[data-part="input"]')
	const native = root.querySelector<HTMLInputElement>('[data-part="native-input"]')
	const listbox = document.querySelector<HTMLElement>(
		`[data-ooops-combobox-listbox="${CSS.escape(config.id)}"]`
	)
	if (!input || !listbox) return null
	renderOptions(listbox, config.options, [], config.parts)
	const controller = createComboboxController({
		options: config.options,
		...(config.value === undefined ? {} : {value: config.value}),
		...(config.defaultValue === undefined ? {} : {defaultValue: config.defaultValue}),
		allowCustomValue: config.allowCustomValue ?? false,
		disabled: config.disabled ?? false,
		portal: config.portal ?? true,
		getRoot: () => root,
		getInput: () => input,
		getListbox: () => listbox,
		getOptions: () => Array.from(listbox.querySelectorAll('[data-part="option"]')),
		getNativeInput: () => native,
		onQueryChange: () =>
			requestAnimationFrame(() =>
				renderOptions(listbox, controller.getState().options, [], config.parts)
			),
		onChange: (detail) =>
			root.dispatchEvent(new CustomEvent('ooops:combobox-change', {bubbles: true, detail}))
	})
	controller.mount()
	const clear = () => controller.setValue('', true)
	root.querySelector('[data-part="clear"]')?.addEventListener('click', clear)
	return {
		destroy: () => {
			root.querySelector('[data-part="clear"]')?.removeEventListener('click', clear)
			controller.destroy()
			if (listbox.dataset.ooopsPortalOwned === 'true') listbox.remove()
		}
	}
}

type MultiConfig = {
	parts?: UiParts
	id: string
	values?: string[]
	defaultValues?: string[]
	options: SelectOption[]
	maxSelected?: number
	disabled?: boolean
	name?: string
	messages?: {removeItem: string}
}
const mountMultiSelect = (root: HTMLElement) => {
	const config = readUiConfig<MultiConfig>(root)
	const input = root.querySelector<HTMLInputElement>('[data-part="input"]')
	const listbox = document.querySelector<HTMLElement>(
		`[data-ooops-multi-select-listbox="${CSS.escape(config.id)}"]`
	)
	if (!input || !listbox) return null
	const renderValues = (values: ReadonlyArray<string>) => {
		const chips = root.querySelector<HTMLElement>('[data-part="chips"]')
		if (chips) {
			chips.replaceChildren(
				...values.map((value) => {
					const chip = document.createElement('span')
					chip.dataset.part = 'chip'
					applyPart(chip, config.parts, 'chip')
					chip.dataset.ooopsUi = ''
					chip.dataset.value = value
					chip.append(config.options.find((entry) => entry.value === value)?.label ?? value)
					const remove = document.createElement('button')
					remove.type = 'button'
					remove.disabled = input.disabled
					remove.dataset.ooopsUi = ''
					remove.dataset.part = 'chip-remove'
					applyPart(remove, config.parts, 'chip-remove')
					remove.dataset.removeValue = value
					const label = config.options.find((entry) => entry.value === value)?.label ?? value
					remove.ariaLabel = formatUiMessage(config.messages?.removeItem ?? 'Remove {label}', {
						label
					})
					remove.textContent = '×'
					chip.appendChild(remove)
					return chip
				})
			)
		}
		root.querySelectorAll('[data-generated-input]').forEach((element) => element.remove())
		for (const value of values) {
			const hidden = document.createElement('input')
			hidden.type = 'hidden'
			hidden.disabled = input.disabled
			hidden.name = config.name ?? config.id
			hidden.value = value
			hidden.dataset.generatedInput = 'true'
			root.appendChild(hidden)
		}
		renderOptions(listbox, controller.getState().options, values, config.parts)
	}
	renderOptions(
		listbox,
		config.options,
		config.values ?? config.defaultValues ?? [],
		config.parts
	)
	const controller = createMultiSelectController({
		options: config.options,
		...(config.values === undefined ? {} : {values: config.values}),
		...(config.defaultValues === undefined ? {} : {defaultValues: config.defaultValues}),
		...(config.maxSelected === undefined ? {} : {maxSelected: config.maxSelected}),
		disabled: config.disabled ?? false,
		getRoot: () => root,
		getInput: () => input,
		getListbox: () => listbox,
		getOptions: () => Array.from(listbox.querySelectorAll('[data-part="option"]')),
		getChips: () => Array.from(root.querySelectorAll('[data-part="chip"]')),
		onChange: (values) => {
			renderValues(values)
			root.dispatchEvent(
				new CustomEvent('ooops:multi-select-change', {bubbles: true, detail: {values}})
			)
		}
	})
	controller.mount()
	renderValues(controller.getState().values)
	const selectAll = () => controller.selectAll()
	const clear = () => controller.clear()
	const selectAllButton = listbox.querySelector('[data-part="select-all"]')
	const clearButtons = [
		...root.querySelectorAll('[data-part="clear"]'),
		...listbox.querySelectorAll('[data-part="clear"]')
	]
	selectAllButton?.addEventListener('click', selectAll)
	for (const button of clearButtons) button.addEventListener('click', clear)
	return {
		destroy: () => {
			selectAllButton?.removeEventListener('click', selectAll)
			for (const button of clearButtons) button.removeEventListener('click', clear)
			controller.destroy()
		}
	}
}

export const installCombobox = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-combobox-root]', mountCombobox, scope)
export const installMultiSelect = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-multi-select-root]', mountMultiSelect, scope)
