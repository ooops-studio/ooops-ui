import {
	dispatchUiEvent,
	enabledIndices,
	isBrowser,
	isNodeInside,
	nextEnabledIndex,
	nextFrame
} from './dom'
import {UI_EVENTS} from './events'
import {createLayerController} from './layer'
import {createControllerStore, type Subscriber} from './store'

export type SelectOption<Value extends string = string, Metadata = unknown> = {
	value: Value
	label: string
	disabled?: boolean
	group?: string
	description?: string
	icon?: string
	iconUrl?: string
	metadata?: Metadata
}

const optionalOptionKeys = [
	'disabled',
	'group',
	'description',
	'icon',
	'iconUrl',
	'metadata'
] as const

const freezeClone = <Value>(value: Value): Value => {
	if (!value || typeof value !== 'object') return value
	let clone: Value
	try {
		clone = structuredClone(value)
	} catch {
		throw new TypeError('Select option metadata must be structured-cloneable.')
	}
	const seen = new WeakSet<object>()
	const freeze = (entry: unknown): void => {
		if (!entry || typeof entry !== 'object' || seen.has(entry)) return
		seen.add(entry)
		for (const child of Object.values(entry)) freeze(child)
		Object.freeze(entry)
	}
	freeze(clone)
	return clone
}

export const snapshotSelectOptions = <Value extends string = string, Metadata = unknown>(
	entries: ReadonlyArray<SelectOption<Value, Metadata>>
): ReadonlyArray<SelectOption<Value, Metadata>> => {
	try {
		return Object.freeze(
			entries.map((entry) => {
				const descriptors = Object.getOwnPropertyDescriptors(entry)
				for (const [key, descriptor] of Object.entries(descriptors)) {
					if ('get' in descriptor || 'set' in descriptor)
						throw new TypeError(`Select option property "${key}" must be a data property.`)
				}
				const value = descriptors.value?.value
				const label = descriptors.label?.value
				if (typeof value !== 'string' || typeof label !== 'string')
					throw new TypeError('Select options require string value and label properties.')
				const snapshot: Record<string, unknown> = {value, label}
				for (const key of optionalOptionKeys) {
					const propertyValue = descriptors[key]?.value
					if (propertyValue !== undefined)
						snapshot[key] = key === 'metadata' ? freezeClone(propertyValue) : propertyValue
				}
				return Object.freeze(snapshot) as SelectOption<Value, Metadata>
			})
		)
	} catch(error) {
		if (error instanceof TypeError) throw error
		throw new TypeError('Select options must be finite plain data objects.')
	}
}

export type SelectPlacement = 'top' | 'bottom'

export type SelectState<Value extends string = string> = {
	open: boolean
	value: Value | ''
	activeIndex: number
	placement: SelectPlacement
	mounted: boolean
}

export type SelectChangeDetail<Value extends string = string> = {
	value: Value | ''
	option: SelectOption<Value> | null
}

export type SelectControllerOptions<Value extends string = string> = {
	options: ReadonlyArray<SelectOption<Value>>
	value?: Value | ''
	defaultValue?: Value | ''
	disabled?: boolean
	allowEmpty?: boolean
	loop?: boolean
	typeaheadTimeoutMs?: number
	offset?: number
	viewportPadding?: number
	maxHeight?: number
	minWidth?: number
	getRoot: () => HTMLElement | null | undefined
	getTrigger: () => HTMLElement | null | undefined
	getListbox: () => HTMLElement | null | undefined
	getNativeSelect?: () => HTMLSelectElement | null | undefined
	onChange?: (detail: SelectChangeDetail<Value>) => void
	onOpenChange?: (open: boolean) => void
}

export type SelectController<Value extends string = string> = {
	getState: () => SelectState<Value>
	subscribe: (subscriber: Subscriber<SelectState<Value>>) => () => void
	mount: () => void
	destroy: () => void
	open: () => void
	close: (options?: {focusTrigger?: boolean}) => void
	toggle: () => void
	setValue: (value: Value | '', options?: {emit?: boolean}) => void
	setOptions: (options: ReadonlyArray<SelectOption<Value>>) => void
	setDisabled: (disabled: boolean) => void
	setAllowEmpty: (allowEmpty: boolean) => void
	selectIndex: (index: number) => void
	setActiveIndex: (index: number) => void
	updatePosition: () => void
}

export const createSelectController = <Value extends string = string>(
	config: SelectControllerOptions<Value>
): SelectController<Value> => {
	let options = snapshotSelectOptions(config.options)
	let disabled = config.disabled ?? false
	let allowEmpty = config.allowEmpty ?? true
	let mounted = false
	let typeahead = ''
	let typeaheadTimer: number | undefined
	let dispatchingNative = false
	let form: HTMLFormElement | null = null
	const initialValue = config.value ?? config.defaultValue ?? ''
	const store = createControllerStore<SelectState<Value>>({
		open: false,
		value: initialValue,
		activeIndex: -1,
		placement: 'bottom',
		mounted: false
	})

	const selectedIndex = () => options.findIndex((option) => option.value === store.getState().value)
	const optionElements = () =>
		Array.from(
			config.getListbox()?.querySelectorAll<HTMLElement>('[data-ooops-select-option]') ?? []
		)

	const syncDom = () => {
		const state = store.getState()
		const trigger = config.getTrigger()
		const listbox = config.getListbox()
		const nativeSelect = config.getNativeSelect?.()
		trigger?.setAttribute('aria-expanded', String(state.open))
		trigger?.toggleAttribute('disabled', disabled)
		trigger?.setAttribute('data-state', state.open ? 'open' : 'closed')
		const activeOption = optionElements()[state.activeIndex]
		if (state.open && activeOption?.id)
			trigger?.setAttribute('aria-activedescendant', activeOption.id)
		else trigger?.removeAttribute('aria-activedescendant')
		if (listbox) {
			listbox.hidden = !state.open
			listbox.setAttribute('data-state', state.open ? 'open' : 'closed')
			listbox.setAttribute('data-placement', state.placement)
		}
		for (const [index, element] of optionElements().entries()) {
			const option = options[index]
			const selected = option?.value === state.value
			element.setAttribute('aria-selected', String(selected))
			element.setAttribute('data-selected', selected ? 'true' : 'false')
			element.setAttribute('data-active', index === state.activeIndex ? 'true' : 'false')
		}
		if (nativeSelect && nativeSelect.value !== state.value) nativeSelect.value = state.value
	}

	const emit = () => {
		syncDom()
		const state = store.getState()
		const option = options.find((entry) => entry.value === state.value) ?? null
		const detail = {value: state.value, option} as SelectChangeDetail<Value>
		config.onChange?.(detail)
		dispatchUiEvent(config.getRoot(), UI_EVENTS.selectChange, detail)
	}

	const finishClose = () => {
		if (!store.getState().open) return
		store.setState({open: false, activeIndex: -1})
		config.onOpenChange?.(false)
		syncDom()
	}
	const layer = createLayerController({
		getAnchor: config.getTrigger,
		getLayer: config.getListbox,
		placement: 'bottom',
		align: 'start',
		offset: config.offset ?? 6,
		...(config.viewportPadding === undefined
			? {}
			: {viewportPadding: config.viewportPadding}),
		matchAnchorWidth: true,
		closeOnOutsideFocus: true,
		isTargetInside: (target) =>
			isNodeInside(target, [config.getRoot(), config.getTrigger(), config.getListbox()]),
		onPosition: (position) => {
			const listbox = config.getListbox()
			if (listbox) {
				const maxHeight = Math.max(72, Math.min(config.maxHeight ?? 300, position.maxHeight))
				listbox.style.maxHeight = `${maxHeight}px`
				listbox.style.minWidth = `${Math.max(position.anchorWidth, config.minWidth ?? 0)}px`
			}
			store.setState({placement: position.placement === 'top' ? 'top' : 'bottom'})
			syncDom()
		},
		onClose: finishClose
	})
	const updatePosition = layer.update

	const setActiveIndex = (index: number) => {
		if (index < 0 || index >= options.length || options[index]?.disabled) return
		store.setState({activeIndex: index})
		syncDom()
		optionElements()[index]?.scrollIntoView?.({block: 'nearest'})
	}

	const open = () => {
		if (disabled || store.getState().open) return
		const firstEnabled = enabledIndices(options)[0] ?? -1
		const activeIndex =
			selectedIndex() >= 0 && !options[selectedIndex()]?.disabled ? selectedIndex() : firstEnabled
		store.setState({open: true, activeIndex})
		layer.open()
		config.onOpenChange?.(true)
		syncDom()
		nextFrame(layer.update)
	}

	const close = (closeOptions: {focusTrigger?: boolean} = {}) => {
		if (!store.getState().open) return
		layer.close()
		if (closeOptions.focusTrigger) config.getTrigger()?.focus()
	}

	const setValue = (value: Value | '', setOptions: {emit?: boolean} = {}) => {
		if (value !== '' && !options.some((option) => option.value === value && !option.disabled))
			return
		if (value === '' && !allowEmpty) return
		store.setState({value})
		if (setOptions.emit) {
			const nativeSelect = config.getNativeSelect?.()
			if (nativeSelect) {
				nativeSelect.value = value
				dispatchingNative = true
				nativeSelect.dispatchEvent(new Event('input', {bubbles: true}))
				nativeSelect.dispatchEvent(new Event('change', {bubbles: true}))
				dispatchingNative = false
			}
			emit()
		} else syncDom()
	}

	const selectIndex = (index: number) => {
		const option = options[index]
		if (!option || option.disabled) return
		setValue(option.value, {emit: true})
		close({focusTrigger: true})
	}

	const move = (direction: 1 | -1) => {
		const current = store.getState().activeIndex
		setActiveIndex(nextEnabledIndex(options, current, direction, config.loop !== false))
	}

	const handleTypeahead = (key: string) => {
		if (!isBrowser() || key.length !== 1 || key.trim() === '') return
		window.clearTimeout(typeaheadTimer)
		typeahead += key.toLocaleLowerCase()
		const repeated = typeahead.split('').every((character) => character === typeahead[0])
		const query = repeated ? key.toLocaleLowerCase() : typeahead
		const start = Math.max(0, store.getState().activeIndex + 1)
		const ordered = [...options.slice(start), ...options.slice(0, start)]
		const match = ordered.find(
			(option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(query)
		)
		if (match) setActiveIndex(options.indexOf(match))
		typeaheadTimer = window.setTimeout(() => {
			typeahead = ''
		}, config.typeaheadTimeoutMs ?? 700)
	}

	const handleTriggerKeydown = (event: KeyboardEvent) => {
		if (disabled) return
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			if (!store.getState().open) open()
			else move(event.key === 'ArrowDown' ? 1 : -1)
			return
		}
		if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault()
			if (!store.getState().open) open()
			const enabled = enabledIndices(options)
			setActiveIndex(event.key === 'Home' ? (enabled[0] ?? -1) : (enabled.at(-1) ?? -1))
			return
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			if (!store.getState().open) open()
			else selectIndex(store.getState().activeIndex)
			return
		}
		if (event.key === 'Escape') {
			event.preventDefault()
			close({focusTrigger: true})
			return
		}
		if (event.key === 'Tab') {
			close()
			return
		}
		handleTypeahead(event.key)
	}

	const handleListboxPointerdown = (event: PointerEvent) => {
		const element = (event.target as Element | null)?.closest<HTMLElement>(
			'[data-ooops-select-option]'
		)
		if (!element) return
		event.preventDefault()
		selectIndex(Number(element.dataset.optionIndex))
	}

	const handleListboxPointermove = (event: PointerEvent) => {
		const element = (event.target as Element | null)?.closest<HTMLElement>(
			'[data-ooops-select-option]'
		)
		if (!element) return
		setActiveIndex(Number(element.dataset.optionIndex))
	}

	const handleNativeChange = (event: Event) => {
		if (dispatchingNative) return
		const target = event.currentTarget as HTMLSelectElement
		const nextValue = target.value as Value | ''
		if (
			nextValue !== '' &&
			!options.some((option) => option.value === nextValue && !option.disabled)
		)
			return
		store.setState({value: nextValue})
		emit()
	}

	const handleFormReset = () => nextFrame(() => setValue((config.defaultValue ?? '') as Value | ''))
	const handleTriggerClick = () => (store.getState().open ? close() : open())

	const mount = () => {
		if (mounted || !isBrowser()) return
		const trigger = config.getTrigger()
		const listbox = config.getListbox()
		const nativeSelect = config.getNativeSelect?.()
		if (!trigger || !listbox) return
		mounted = true
		trigger.addEventListener('click', handleTriggerClick)
		trigger.addEventListener('keydown', handleTriggerKeydown)
		listbox.addEventListener('pointerdown', handleListboxPointerdown)
		listbox.addEventListener('pointermove', handleListboxPointermove)
		layer.mount()
		nativeSelect?.addEventListener('change', handleNativeChange)
		form = nativeSelect?.form ?? null
		form?.addEventListener('reset', handleFormReset)
		store.setState({mounted: true})
		syncDom()
	}

	const destroy = () => {
		if (!mounted) return
		const trigger = config.getTrigger()
		const listbox = config.getListbox()
		const nativeSelect = config.getNativeSelect?.()
		trigger?.removeEventListener('click', handleTriggerClick)
		trigger?.removeEventListener('keydown', handleTriggerKeydown)
		listbox?.removeEventListener('pointerdown', handleListboxPointerdown)
		listbox?.removeEventListener('pointermove', handleListboxPointermove)
		layer.destroy()
		nativeSelect?.removeEventListener('change', handleNativeChange)
		form?.removeEventListener('reset', handleFormReset)
		if (typeaheadTimer) window.clearTimeout(typeaheadTimer)
		mounted = false
		store.setState({mounted: false, open: false, activeIndex: -1})
		store.clear()
	}

	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount,
		destroy,
		open,
		close,
		toggle: () => (store.getState().open ? close() : open()),
		setValue,
		setOptions(nextOptions) {
			options = snapshotSelectOptions(nextOptions)
			if (
				store.getState().value &&
				!options.some((option) => option.value === store.getState().value)
			) {
				store.setState({value: ''})
			}
			syncDom()
		},
		setDisabled(nextDisabled) {
			disabled = nextDisabled
			if (disabled) finishClose()
			syncDom()
		},
		setAllowEmpty(nextAllowEmpty) {
			allowEmpty = nextAllowEmpty
			if (!allowEmpty && store.getState().value === '') {
				const first = options.find((option) => !option.disabled)
				if (first) setValue(first.value)
			}
		},
		selectIndex,
		setActiveIndex,
		updatePosition
	}
}
