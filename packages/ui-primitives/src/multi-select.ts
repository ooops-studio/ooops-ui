import {createLayerController} from './layer'
import {snapshotSelectOptions, type SelectOption} from './select'
import {createControllerStore, type Subscriber} from './store'

export type MultiSelectState<Value extends string = string, Metadata = unknown> = {
	open: boolean
	query: string
	values: ReadonlyArray<Value>
	options: ReadonlyArray<SelectOption<Value, Metadata>>
	activeIndex: number
	mounted: boolean
}

export type MultiSelectControllerOptions<Value extends string = string, Metadata = unknown> = {
	options: ReadonlyArray<SelectOption<Value, Metadata>>
	values?: ReadonlyArray<Value>
	defaultValues?: ReadonlyArray<Value>
	maxSelected?: number
	disabled?: boolean
	filter?: (option: SelectOption<Value, Metadata>, query: string) => boolean
	getRoot: () => HTMLElement | null | undefined
	getInput: () => HTMLInputElement | null | undefined
	getListbox: () => HTMLElement | null | undefined
	getOptions: () => ReadonlyArray<HTMLElement>
	getHiddenInputs?: () => ReadonlyArray<HTMLInputElement>
	getChips?: () => ReadonlyArray<HTMLElement>
	onChange?: (values: ReadonlyArray<Value>) => void
}

const unique = <Value extends string>(values: ReadonlyArray<Value>) =>
	Object.freeze([...new Set(values)])

export const createMultiSelectController = <Value extends string = string, Metadata = unknown>(
	options: MultiSelectControllerOptions<Value, Metadata>
) => {
	let source = snapshotSelectOptions(options.options)
	let disabled = options.disabled ?? false
	let maxSelected = options.maxSelected ?? Number.MAX_SAFE_INTEGER
	if (!Number.isInteger(maxSelected) || maxSelected < 0)
		throw new RangeError('MultiSelect maxSelected must be a non-negative integer.')
	const initial = unique(options.values ?? options.defaultValues ?? [])
	const store = createControllerStore<MultiSelectState<Value, Metadata>>({
		open: false,
		query: '',
		values: initial,
		options: source,
		activeIndex: -1,
		mounted: false
	})
	const layer = createLayerController({
		getAnchor: options.getInput,
		getLayer: options.getListbox,
		matchAnchorWidth: true,
		closeOnOutsideFocus: true,
		onClose: () => store.setState({open: false})
	})
	const filter = () => {
		const query = store.getState().query.trim().toLocaleLowerCase()
		const entries = query
			? source.filter((entry) =>
				(options.filter ?? ((option, value) => option.label.toLocaleLowerCase().includes(value)))(
					entry,
					query
				)
			)
			: source
		store.setState({
			options: Object.freeze(entries),
			activeIndex: entries.findIndex((entry) => !entry.disabled)
		})
	}
	const sync = () => {
		const state = store.getState()
		const input = options.getInput()
		input?.setAttribute('aria-expanded', String(state.open))
		input?.setAttribute('aria-controls', options.getListbox()?.id ?? '')
		const active = options.getOptions()[state.activeIndex]
		if (state.open && active?.id) input?.setAttribute('aria-activedescendant', active.id)
		else input?.removeAttribute('aria-activedescendant')
		options.getOptions().forEach((element, index) => {
			const selected = state.values.includes(state.options[index]?.value as Value)
			element.dataset.active = String(index === state.activeIndex)
			element.dataset.selected = String(selected)
			element.setAttribute('aria-selected', String(selected))
		})
		options
			.getChips?.()
			.forEach(
				(chip) =>
					(chip.dataset.selected = String(state.values.includes(chip.dataset.value as Value)))
			)
	}
	const emit = (values: ReadonlyArray<Value>) => options.onChange?.(Object.freeze([...values]))
	const setValues = (values: ReadonlyArray<Value>, shouldEmit = false) => {
		const allowed = unique(
			values.filter((value) => source.some((entry) => entry.value === value && !entry.disabled))
		).slice(0, maxSelected)
		store.setState({values: Object.freeze(allowed)})
		sync()
		if (shouldEmit) emit(allowed)
	}
	const toggleValue = (value: Value) => {
		const state = store.getState()
		const entry = source.find((option) => option.value === value)
		if (!entry || entry.disabled) return
		setValues(
			state.values.includes(value)
				? state.values.filter((selected) => selected !== value)
				: [...state.values, value],
			true
		)
	}
	const open = () => {
		if (!disabled && !store.getState().open) {
			store.setState({open: true})
			layer.open()
			filter()
			sync()
		}
	}
	const close = () => {
		layer.close()
		store.setState({open: false, activeIndex: -1})
		sync()
	}
	const setQuery = (query: string) => {
		store.setState({query})
		filter()
		open()
		sync()
	}
	const move = (direction: 1 | -1) => {
		const entries = store.getState().options
		let index = store.getState().activeIndex
		for (let attempt = 0; attempt < entries.length; attempt += 1) {
			index = (index + direction + entries.length) % entries.length
			if (!entries[index]?.disabled) {
				store.setState({activeIndex: index})
				sync()
				options.getOptions()[index]?.scrollIntoView?.({block: 'nearest'})
				return
			}
		}
	}
	const onInput = (event: Event) => setQuery((event.currentTarget as HTMLInputElement).value)
	const onFocus = () => open()
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			open()
			move(event.key === 'ArrowDown' ? 1 : -1)
		} else if (
			(event.key === 'Enter' || event.key === ' ') &&
			store.getState().open &&
			store.getState().activeIndex >= 0
		) {
			event.preventDefault()
			const entry = store.getState().options[store.getState().activeIndex]
			if (entry) toggleValue(entry.value)
		} else if (
			event.key === 'Backspace' &&
			!store.getState().query &&
			store.getState().values.length
		) {
			setValues(store.getState().values.slice(0, -1), true)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			close()
		}
	}
	const onOptionPointer = (event: PointerEvent) => {
		const item = (event.target as Element | null)?.closest<HTMLElement>('[data-option-index]')
		const entry = item ? store.getState().options[Number(item.dataset.optionIndex)] : undefined
		if (entry) {
			event.preventDefault()
			toggleValue(entry.value)
			options.getInput()?.focus()
		}
	}
	const onChip = (event: MouseEvent) => {
		const chip = (event.target as Element | null)?.closest<HTMLElement>('[data-remove-value]')
		if (chip?.dataset.removeValue) toggleValue(chip.dataset.removeValue as Value)
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe as (
			subscriber: Subscriber<MultiSelectState<Value, Metadata>>
		) => () => void,
		mount() {
			if (store.getState().mounted) return
			const input = options.getInput()
			const listbox = options.getListbox()
			if (!input || !listbox) return
			layer.mount()
			input.addEventListener('input', onInput)
			input.addEventListener('focus', onFocus)
			input.addEventListener('keydown', onKey)
			listbox.addEventListener('pointerdown', onOptionPointer)
			options.getRoot()?.addEventListener('click', onChip)
			store.setState({mounted: true})
			filter()
			sync()
		},
		open,
		close,
		move,
		setQuery,
		setValues,
		toggleValue,
		selectAll() {
			setValues(
				source.filter((entry) => !entry.disabled).map((entry) => entry.value),
				true
			)
		},
		clear() {
			setValues([], true)
		},
		setOptions(entries: ReadonlyArray<SelectOption<Value, Metadata>>) {
			source = snapshotSelectOptions(entries)
			const current = store.getState().values
			const valid = current.filter((value) =>
				source.some((entry) => entry.value === value && !entry.disabled)
			).slice(0, maxSelected)
			setValues(current, valid.length !== current.length)
			filter()
			sync()
		},
		setDisabled(nextDisabled: boolean) {
			disabled = nextDisabled
			if (disabled) close()
			options.getInput()?.toggleAttribute('disabled', disabled)
		},
		setMaxSelected(nextMaxSelected?: number) {
			if (
				nextMaxSelected !== undefined &&
				(!Number.isInteger(nextMaxSelected) || nextMaxSelected < 0)
			)
				throw new RangeError('MultiSelect maxSelected must be a non-negative integer.')
			maxSelected = nextMaxSelected ?? Number.MAX_SAFE_INTEGER
			const current = store.getState().values
			setValues(current, current.length > maxSelected)
		},
		destroy() {
			const input = options.getInput()
			input?.removeEventListener('input', onInput)
			input?.removeEventListener('focus', onFocus)
			input?.removeEventListener('keydown', onKey)
			options.getListbox()?.removeEventListener('pointerdown', onOptionPointer)
			options.getRoot()?.removeEventListener('click', onChip)
			layer.destroy()
			store.setState({mounted: false, open: false})
			store.clear()
		}
	}
}
