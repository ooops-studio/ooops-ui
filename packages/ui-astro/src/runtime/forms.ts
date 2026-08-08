import {
	createCheckboxController,
	createInputController,
	createNumberInputController,
	createRadioGroupController,
	createSegmentedControlController,
	createSliderController,
	createSwitchController,
	createTextareaController,
	type ChoiceOption,
	type SliderValue
} from '@ooopsstudio/ui-primitives'

import {mountUiRoots, readUiConfig} from './shared'

type TextConfig = {
	value?: string
	defaultValue?: string
	autoResize?: boolean
	minRows?: number
	maxRows?: number
}

const mountInput = (root: HTMLElement) => {
	const config = readUiConfig<TextConfig>(root)
	const input = root.querySelector<HTMLInputElement>('[data-part="control"]')
	if (!input) return null
	const controller = createInputController({...config, getElement: () => input})
	const clear = () => controller.setValue('', true)
	const reveal = () => {
		input.type = input.type === 'password' ? 'text' : 'password'
		root.dataset.revealed = String(input.type === 'text')
		input.focus()
	}
	root.querySelector('[data-part="clear"]')?.addEventListener('click', clear)
	root.querySelector('[data-part="reveal"]')?.addEventListener('click', reveal)
	controller.mount()
	return {
		destroy: () => {
			root.querySelector('[data-part="clear"]')?.removeEventListener('click', clear)
			root.querySelector('[data-part="reveal"]')?.removeEventListener('click', reveal)
			controller.destroy()
		}
	}
}

const mountTextarea = (root: HTMLElement) => {
	const config = readUiConfig<TextConfig>(root)
	const element = root.querySelector<HTMLTextAreaElement>('[data-part="control"]')
	if (!element) return null
	const counter = root.querySelector<HTMLElement>('[data-part="counter"]')
	const updateCounter = () => {
		if (counter)
			counter.textContent =
				element.maxLength >= 0
					? `${element.value.length}/${element.maxLength}`
					: String(element.value.length)
	}
	const controller = createTextareaController({
		...config,
		getElement: () => element,
		onValueChange: updateCounter
	})
	controller.mount()
	updateCounter()
	return {destroy: controller.destroy}
}

type CheckConfig = {
	checked?: boolean
	defaultChecked?: boolean
	indeterminate?: boolean
	disabled?: boolean
	switch?: boolean
}
const mountCheck = (root: HTMLElement) => {
	const config = readUiConfig<CheckConfig>(root)
	const input = root.querySelector<HTMLInputElement>('[data-part="control"]')
	if (!input) return null
	const controller = config.switch
		? createSwitchController({...config, disabled: input.disabled, getInput: () => input})
		: createCheckboxController({...config, disabled: input.disabled, getInput: () => input})
	controller.mount()
	return {destroy: controller.destroy}
}

type ChoiceConfig = {
	value?: string
	defaultValue?: string
	options: ChoiceOption[]
	type: 'radio' | 'segmented'
}
const mountChoice = (root: HTMLElement) => {
	const config = readUiConfig<ChoiceConfig>(root)
	const getInputs = () =>
		Array.from(
			root.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
				config.type === 'radio' ? '[data-part="control"]' : '[data-part="option"]'
			)
		)
	const hidden = root.querySelector<HTMLInputElement>('[data-part="input"]')
	const controller = (
		config.type === 'radio' ? createRadioGroupController : createSegmentedControlController
	)({
		...config,
		getRoot: () => root,
		getInputs,
		onChange: (value) => {
			if (hidden) hidden.value = value
			root.dispatchEvent(
				new CustomEvent(`ooops:${config.type}-change`, {bubbles: true, detail: {value}})
			)
		}
	})
	controller.mount()
	return {destroy: controller.destroy}
}

type NumberConfig = {
	value?: number | null
	defaultValue?: number | null
	min?: number
	max?: number
	step?: number
	clampOnBlur?: boolean
}
const mountNumber = (root: HTMLElement) => {
	const config = readUiConfig<NumberConfig>(root)
	const controller = createNumberInputController({
		...config,
		getInput: () => root.querySelector<HTMLInputElement>('[data-part="control"]'),
		getIncrement: () => root.querySelector<HTMLElement>('[data-part="increment"]'),
		getDecrement: () => root.querySelector<HTMLElement>('[data-part="decrement"]')
	})
	controller.mount()
	return {destroy: controller.destroy}
}

type SliderConfig = {
	value?: SliderValue
	defaultValue?: SliderValue
	min?: number
	max?: number
	step?: number
	orientation?: 'horizontal' | 'vertical'
	direction?: 'ltr' | 'rtl'
	minStepsBetweenThumbs?: number
}
const mountSlider = (root: HTMLElement) => {
	const config = readUiConfig<SliderConfig>(root)
	const controller = createSliderController({
		...config,
		getRoot: () => root,
		getThumbs: () => Array.from(root.querySelectorAll('[data-part="thumb"]')),
		getInputs: () => Array.from(root.querySelectorAll('[data-part="input"]'))
	})
	controller.mount()
	return {destroy: controller.destroy}
}

export const installInput = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-input-root]', mountInput, scope)
export const installTextarea = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-textarea-root]', mountTextarea, scope)
export const installCheckbox = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-checkbox-root]', mountCheck, scope)
export const installSwitch = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-switch-root]', mountCheck, scope)
export const installRadioGroup = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-radio-group-root]', mountChoice, scope)
export const installSegmentedControl = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-segmented-root]', mountChoice, scope)
export const installNumberInput = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-number-root]', mountNumber, scope)
export const installSlider = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-slider-root]', mountSlider, scope)
