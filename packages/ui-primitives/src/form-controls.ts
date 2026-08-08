import {snapshotSelectOptions} from './select'
import {createControllerStore, type Subscriber} from './store'

type NativeValueState<Value> = {value: Value; mounted: boolean}

export type NativeControlController<Value> = {
	getState: () => NativeValueState<Value>
	subscribe: (subscriber: Subscriber<NativeValueState<Value>>) => () => void
	mount: () => void
	setValue: (value: Value, emit?: boolean) => void
	reset: () => void
	destroy: () => void
}

type TextControlOptions<Element extends HTMLInputElement | HTMLTextAreaElement> = {
	value?: string
	defaultValue?: string
	getElement: () => Element | null | undefined
	onValueChange?: (value: string) => void
}

const createTextControl = <Element extends HTMLInputElement | HTMLTextAreaElement>(
	options: TextControlOptions<Element>
): NativeControlController<string> => {
	let mounted = false
	let form: HTMLFormElement | null = null
	const initial = options.value ?? options.defaultValue ?? ''
	const store = createControllerStore<NativeValueState<string>>({value: initial, mounted: false})
	const setValue = (value: string, emit = false) => {
		store.setState({value})
		const element = options.getElement()
		if (element && element.value !== value) element.value = value
		if (emit) options.onValueChange?.(value)
	}
	const onInput = (event: Event) => setValue((event.currentTarget as Element).value, true)
	const reset = () => setValue(options.defaultValue ?? initial)
	const onReset = () => requestAnimationFrame(reset)
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount() {
			if (mounted) return
			const element = options.getElement()
			if (!element) return
			const preMountValue = element.value
			const hasPreMountEdit = preMountValue !== element.defaultValue
			mounted = true
			form = element.form
			element.addEventListener('input', onInput)
			form?.addEventListener('reset', onReset)
			store.setState({mounted: true})
			setValue(hasPreMountEdit ? preMountValue : initial)
		},
		setValue,
		reset,
		destroy() {
			if (!mounted) return
			options.getElement()?.removeEventListener('input', onInput)
			form?.removeEventListener('reset', onReset)
			mounted = false
			store.setState({mounted: false})
			store.clear()
		}
	}
}

export const createInputController = (options: TextControlOptions<HTMLInputElement>) =>
	createTextControl(options)

export type TextareaControllerOptions = TextControlOptions<HTMLTextAreaElement> & {
	autoResize?: boolean
	minRows?: number
	maxRows?: number
}

export const createTextareaController = (
	options: TextareaControllerOptions
): NativeControlController<string> & {resize: () => void} => {
	const base = createTextControl(options)
	const resize = () => {
		const element = options.getElement()
		if (!element || !options.autoResize) return
		const style = getComputedStyle(element)
		const lineHeight = Number.parseFloat(style.lineHeight) || 20
		const border =
			Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)
		const min = (options.minRows ?? element.rows ?? 2) * lineHeight + border
		const max = (options.maxRows ?? 20) * lineHeight + border
		element.style.height = 'auto'
		element.style.height = `${Math.max(min, Math.min(element.scrollHeight, max))}px`
		element.style.overflowY = element.scrollHeight > max ? 'auto' : 'hidden'
	}
	let unsubscribe: (() => void) | null = null
	return {
		...base,
		mount() {
			base.mount()
			unsubscribe = base.subscribe(resize)
			resize()
		},
		setValue(value, emit) {
			base.setValue(value, emit)
			resize()
		},
		resize,
		destroy() {
			unsubscribe?.()
			base.destroy()
		}
	}
}

export type CheckboxState = {
	checked: boolean
	indeterminate: boolean
	disabled: boolean
	mounted: boolean
}
export type CheckboxControllerOptions = {
	checked?: boolean
	defaultChecked?: boolean
	indeterminate?: boolean
	disabled?: boolean
	getInput: () => HTMLInputElement | null | undefined
	onChange?: (state: Readonly<Pick<CheckboxState, 'checked' | 'indeterminate'>>) => void
}

export const createCheckboxController = (options: CheckboxControllerOptions) => {
	const initial = options.checked ?? options.defaultChecked ?? false
	const store = createControllerStore<CheckboxState>({
		checked: initial,
		indeterminate: options.indeterminate ?? false,
		disabled: options.disabled ?? false,
		mounted: false
	})
	let form: HTMLFormElement | null = null
	const sync = () => {
		const input = options.getInput()
		const state = store.getState()
		if (!input) return
		input.checked = state.checked
		input.indeterminate = state.indeterminate
		input.disabled = state.disabled
		input.setAttribute('aria-checked', state.indeterminate ? 'mixed' : String(state.checked))
		const root = input.closest<HTMLElement>('[data-part="root"]')
		root?.setAttribute(
			'data-state',
			state.indeterminate ? 'indeterminate' : state.checked ? 'checked' : 'unchecked'
		)
		root?.setAttribute('data-disabled', String(state.disabled))
	}
	const setChecked = (checked: boolean, emit = false) => {
		store.setState({checked, indeterminate: false})
		sync()
		if (emit) options.onChange?.({checked, indeterminate: false})
	}
	const onChange = (event: Event) =>
		setChecked((event.currentTarget as HTMLInputElement).checked, true)
	const onReset = () =>
		requestAnimationFrame(() => {
			store.setState({
				checked: options.defaultChecked ?? initial,
				indeterminate: options.indeterminate ?? false
			})
			sync()
		})
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount() {
			const input = options.getInput()
			if (!input || store.getState().mounted) return
			form = input.form
			input.addEventListener('change', onChange)
			form?.addEventListener('reset', onReset)
			store.setState({mounted: true})
			sync()
		},
		setChecked,
		setIndeterminate(indeterminate: boolean) {
			store.setState({indeterminate})
			sync()
		},
		setDisabled(disabled: boolean) {
			store.setState({disabled})
			sync()
		},
		reset: onReset,
		destroy() {
			options.getInput()?.removeEventListener('change', onChange)
			form?.removeEventListener('reset', onReset)
			store.setState({mounted: false})
			store.clear()
		}
	}
}

export type ChoiceOption<Value extends string = string> = {
	value: Value
	label: string
	description?: string
	disabled?: boolean
}
export type ChoiceControllerOptions<Value extends string = string> = {
	options: ReadonlyArray<ChoiceOption<Value>>
	value?: Value | ''
	defaultValue?: Value | ''
	disabled?: boolean
	loop?: boolean
	getRoot: () => HTMLElement | null | undefined
	getInputs: () => ReadonlyArray<HTMLInputElement | HTMLButtonElement>
	onChange?: (value: Value | '') => void
}

const createChoiceController = <Value extends string>(options: ChoiceControllerOptions<Value>) => {
	let values: ReadonlyArray<ChoiceOption<Value>> = snapshotSelectOptions(options.options)
	const initial = options.value ?? options.defaultValue ?? ''
	const store = createControllerStore({value: initial as Value | '', mounted: false})
	const setValue = (value: Value | '', emit = false) => {
		if (value && !values.some((entry) => entry.value === value && !entry.disabled)) return
		store.setState({value})
		for (const input of options.getInputs()) {
			const selected = input.value === value
			if (input instanceof HTMLInputElement) input.checked = selected
			input.setAttribute('aria-checked', String(selected))
			input.tabIndex =
				selected || (!value && input === options.getInputs().find((entry) => !entry.disabled))
					? 0
					: -1
		}
		if (emit) options.onChange?.(value)
	}
	const move = (current: number, direction: 1 | -1) => {
		const enabled = values.flatMap((entry, index) => (entry.disabled ? [] : [index]))
		if (!enabled.length) return
		const position = enabled.indexOf(current)
		const next = enabled[(position + direction + enabled.length) % enabled.length]
		if (next === undefined) return
		setValue(values[next]!.value, true)
		options.getInputs()[next]?.focus()
	}
	const onChange = (event: Event) =>
		setValue((event.currentTarget as HTMLInputElement).value as Value, true)
	const onKey = (event: KeyboardEvent) => {
		const index = options.getInputs().indexOf(event.currentTarget as HTMLInputElement)
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault()
			move(index, 1)
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault()
			move(index, -1)
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault()
			const enabled = values.flatMap((entry, optionIndex) => (entry.disabled ? [] : [optionIndex]))
			const next = event.key === 'Home' ? enabled[0] : enabled.at(-1)
			if (next !== undefined) {
				setValue(values[next]!.value, true)
				options.getInputs()[next]?.focus()
			}
		}
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount() {
			if (store.getState().mounted) return
			for (const input of options.getInputs()) {
				if (input instanceof HTMLInputElement) input.addEventListener('change', onChange)
				else input.addEventListener('click', onChange)
				input.addEventListener('keydown', onKey as EventListener)
			}
			store.setState({mounted: true})
			setValue(initial)
		},
		setValue,
		setOptions(next: ReadonlyArray<ChoiceOption<Value>>) {
			values = snapshotSelectOptions(next)
			setValue(store.getState().value)
		},
		destroy() {
			for (const input of options.getInputs()) {
				if (input instanceof HTMLInputElement) input.removeEventListener('change', onChange)
				else input.removeEventListener('click', onChange)
				input.removeEventListener('keydown', onKey as EventListener)
			}
			store.setState({mounted: false})
			store.clear()
		}
	}
}

export const createRadioGroupController = createChoiceController
export const createSegmentedControlController = createChoiceController

export const createSwitchController = (options: CheckboxControllerOptions) => {
	const controller = createCheckboxController(options)
	return {
		...controller,
		mount() {
			options.getInput()?.setAttribute('role', 'switch')
			controller.mount()
		}
	}
}
