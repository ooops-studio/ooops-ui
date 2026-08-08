import {createLayerController, type LayerAlign, type LayerPlacement} from './layer'
import {snapshotSelectOptions, type SelectOption} from './select'
import {createControllerStore, type Subscriber} from './store'

export type ComboboxLoadOptions<Value extends string = string, Metadata = unknown> = (
	query: string,
	context: {signal: AbortSignal}
) =>
	| ReadonlyArray<SelectOption<Value, Metadata>>
	| Promise<ReadonlyArray<SelectOption<Value, Metadata>>>

export type ComboboxState<Value extends string = string, Metadata = unknown> = {
	open: boolean
	query: string
	value: Value | ''
	activeIndex: number
	options: ReadonlyArray<SelectOption<Value, Metadata>>
	loading: boolean
	error: string | null
	mounted: boolean
}

export type ComboboxControllerOptions<Value extends string = string, Metadata = unknown> = {
	options?: ReadonlyArray<SelectOption<Value, Metadata>>
	value?: Value | ''
	defaultValue?: Value | ''
	allowCustomValue?: boolean
	disabled?: boolean
	debounceMs?: number
	filter?: (option: SelectOption<Value, Metadata>, query: string) => boolean
	loadOptions?: ComboboxLoadOptions<Value, Metadata>
	placement?: LayerPlacement
	align?: LayerAlign
	portal?: boolean
	getRoot: () => HTMLElement | null | undefined
	getInput: () => HTMLInputElement | null | undefined
	getListbox: () => HTMLElement | null | undefined
	getOptions: () => ReadonlyArray<HTMLElement>
	getNativeInput?: () => HTMLInputElement | null | undefined
	onChange?: (detail: {
		value: Value | string | ''
		option: SelectOption<Value, Metadata> | null
		custom: boolean
	}) => void
	onQueryChange?: (query: string) => void
}

const defaultFilter = <Value extends string, Metadata>(
	option: SelectOption<Value, Metadata>,
	query: string
) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())

export const createComboboxController = <Value extends string = string, Metadata = unknown>(
	options: ComboboxControllerOptions<Value, Metadata>
) => {
	let source = snapshotSelectOptions(options.options ?? [])
	let debounceTimer: number | undefined
	let loadRun = 0
	let loadAbort: AbortController | null = null
	const initialValue = options.value ?? options.defaultValue ?? ''
	const initialOption = source.find((entry) => entry.value === initialValue)
	const store = createControllerStore<ComboboxState<Value, Metadata>>({
		open: false,
		query: initialOption?.label ?? '',
		value: initialValue,
		activeIndex: -1,
		options: source,
		loading: false,
		error: null,
		mounted: false
	})
	const layer = createLayerController({
		getAnchor: options.getInput,
		getLayer: options.getListbox,
		placement: options.placement ?? 'bottom',
		align: options.align ?? 'start',
		...(options.portal === undefined ? {} : {portal: options.portal}),
		matchAnchorWidth: true,
		closeOnOutsideFocus: true,
		onClose: () => store.setState({open: false, activeIndex: -1})
	})
	const sync = () => {
		const state = store.getState()
		const input = options.getInput()
		input?.setAttribute('aria-expanded', String(state.open))
		input?.setAttribute('aria-busy', String(state.loading))
		const active = options.getOptions()[state.activeIndex]
		if (state.open && active?.id) input?.setAttribute('aria-activedescendant', active.id)
		else input?.removeAttribute('aria-activedescendant')
		options.getOptions().forEach((element, index) => {
			element.dataset.active = String(index === state.activeIndex)
			element.dataset.selected = String(store.getState().options[index]?.value === state.value)
		})
		const native = options.getNativeInput?.()
		if (native) native.value = state.value
	}
	const setVisibleOptions = (entries: ReadonlyArray<SelectOption<Value, Metadata>>) => {
		const frozen = snapshotSelectOptions(entries)
		store.setState({options: frozen, activeIndex: frozen.findIndex((entry) => !entry.disabled)})
		sync()
	}
	const applyQuery = async(query: string) => {
		options.onQueryChange?.(query)
		if (!options.loadOptions) {
			setVisibleOptions(source.filter((entry) => (options.filter ?? defaultFilter)(entry, query)))
			return
		}
		loadAbort?.abort()
		const abort = new AbortController()
		loadAbort = abort
		const run = ++loadRun
		store.setState({loading: true, error: null})
		try {
			const loaded = await options.loadOptions(query, {signal: abort.signal})
			if (run !== loadRun || abort.signal.aborted) return
			setVisibleOptions(loaded)
			store.setState({loading: false})
		} catch(error) {
			if (run !== loadRun || abort.signal.aborted) return
			store.setState({
				loading: false,
				error: error instanceof Error ? error.message : 'Unable to load options.'
			})
		}
	}
	const scheduleQuery = (query: string) => {
		if (debounceTimer) window.clearTimeout(debounceTimer)
		if (!options.loadOptions || (options.debounceMs ?? 150) <= 0) void applyQuery(query)
		else debounceTimer = window.setTimeout(() => void applyQuery(query), options.debounceMs ?? 150)
	}
	const open = () => {
		if (options.disabled || store.getState().open) return
		store.setState({open: true})
		layer.open()
		sync()
	}
	const close = () => {
		layer.close()
		store.setState({open: false, activeIndex: -1})
		sync()
	}
	const setQuery = (query: string, shouldOpen = true) => {
		store.setState({query})
		if (options.getInput()?.value !== query) options.getInput()!.value = query
		if (shouldOpen) open()
		scheduleQuery(query)
	}
	const setValue = (value: Value | string | '', emit = false) => {
		const option =
			[...source, ...store.getState().options].find((entry) => entry.value === value) ?? null
		if (value && !option && !options.allowCustomValue) return
		store.setState({value: value as Value | '', query: option?.label ?? value})
		const input = options.getInput()
		if (input) input.value = option?.label ?? value
		sync()
		if (emit) options.onChange?.({value, option, custom: Boolean(value && !option)})
	}
	const commit = (index = store.getState().activeIndex) => {
		const option = store.getState().options[index]
		if (option && !option.disabled) setValue(option.value, true)
		else if (options.allowCustomValue && store.getState().query.trim())
			setValue(store.getState().query.trim(), true)
		else return
		close()
	}
	const move = (direction: 1 | -1) => {
		const entries = store.getState().options
		if (!entries.length) return
		let index = store.getState().activeIndex
		for (let attempt = 0; attempt < entries.length; attempt += 1) {
			index = (index + direction + entries.length) % entries.length
			if (!entries[index]?.disabled) {
				store.setState({activeIndex: index})
				sync()
				options.getOptions()[index]?.scrollIntoView?.({block: 'nearest'})
				break
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
		} else if (event.key === 'Enter' && store.getState().open) {
			event.preventDefault()
			commit()
		} else if (event.key === 'Escape') {
			event.preventDefault()
			close()
		} else if (event.key === 'Tab') close()
	}
	const onPointer = (event: PointerEvent) => {
		const item = (event.target as Element | null)?.closest<HTMLElement>('[data-option-index]')
		if (!item) return
		event.preventDefault()
		commit(Number(item.dataset.optionIndex))
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe as (
			subscriber: Subscriber<ComboboxState<Value, Metadata>>
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
			listbox.addEventListener('pointerdown', onPointer)
			store.setState({mounted: true})
			sync()
		},
		open,
		close,
		commit,
		move,
		setQuery,
		setValue,
		setOptions(entries: ReadonlyArray<SelectOption<Value, Metadata>>) {
			source = entries.map((entry) => Object.freeze({...entry}))
			void applyQuery(store.getState().query)
		},
		destroy() {
			loadAbort?.abort()
			if (debounceTimer) window.clearTimeout(debounceTimer)
			const input = options.getInput()
			input?.removeEventListener('input', onInput)
			input?.removeEventListener('focus', onFocus)
			input?.removeEventListener('keydown', onKey)
			options.getListbox()?.removeEventListener('pointerdown', onPointer)
			layer.destroy()
			store.setState({mounted: false, open: false})
			store.clear()
		}
	}
}
