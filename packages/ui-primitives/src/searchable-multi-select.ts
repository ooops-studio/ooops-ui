import {snapshotSelectOptions, type SelectOption} from './select'
import {createControllerStore} from './store'

export type SearchableMultiSelectState = {
	query: string
	open: boolean
	values: readonly string[]
	options: readonly SelectOption[]
}
export type SearchableMultiSelectOptions = {
	options: readonly SelectOption[]
	values?: readonly string[]
	disabled?: boolean
	hideSelected?: boolean
	restoreFocusOnRemove?: boolean
	clearQueryOnEscape?: boolean
	persistentQueryResults?: boolean
	limit?: number
	filter?: (option: SelectOption, query: string) => boolean
	getRoot?: () => HTMLElement | null | undefined
	getInput?: () => HTMLInputElement | null | undefined
	getOptions?: () => readonly HTMLElement[]
	onChange?: (values: readonly string[]) => void
	onAdd?: (value: string) => void
	onRemove?: (value: string) => void
	onCreate?: (query: string) => void
}

/** Inline searchable entity picker. Options receive real focus; creation is a separate action. */
export function createSearchableMultiSelectController(config: SearchableMultiSelectOptions) {
	let source = snapshotSelectOptions(config.options)
	let disabled = config.disabled ?? false
	let hideSelected = config.hideSelected ?? false
	let restoreFocusOnRemove = config.restoreFocusOnRemove ?? true
	let clearQueryOnEscape = config.clearQueryOnEscape ?? false
	let persistentQueryResults = config.persistentQueryResults ?? false
	let match = config.filter
	let limit = config.limit ?? Number.MAX_SAFE_INTEGER
	let destroyed = false
	let focusRevision = 0
	let blurTimer: ReturnType<typeof setTimeout> | undefined
	let pointerPending = false
	let releasePointer: (() => void) | undefined
	const checkLimit = (value: number) => {
		if (!Number.isInteger(value) || value < 0) throw new RangeError('limit must be a non-negative integer')
	}
	checkLimit(limit)
	const store = createControllerStore<SearchableMultiSelectState>({query: '', open: false, values: Object.freeze([...new Set(config.values ?? [])]), options: []})
	const refresh = () => {
		const {query, values} = store.getState()
		const normalized = query.trim().toLocaleLowerCase()
		store.setState({options: Object.freeze(source.filter((entry) =>
			(!hideSelected || !values.includes(entry.value)) &&
			(!normalized || (match
					?? ((option, text) => option.label.toLocaleLowerCase().includes(text))
			)(entry, normalized))
		).slice(0, limit))})
	}
	const close = (restoreFocus = false) => {
		focusRevision++
		if (restoreFocus) config.getInput?.()?.focus()
		store.setState({
			open: !disabled && persistentQueryResults && Boolean(store.getState().query.trim())
		})
	}
	const clearQuery = () => { store.setState({query: ''}); refresh() }
	const setValues = (values: readonly string[]) => {
		// Keep stored IDs even while their records are absent from the current result set.
		store.setState({values: Object.freeze([...new Set(values)])})
		refresh()
	}
	const remove = (value: string) => {
		if (disabled || !store.getState().values.includes(value)) return
		setValues(store.getState().values.filter((entry) => entry !== value))
		config.onRemove?.(value)
		config.onChange?.(store.getState().values)
		close(restoreFocusOnRemove)
	}
	const toggle = (value: string) => {
		if (disabled) return
		if (store.getState().values.includes(value)) {
			remove(value); clearQuery(); close(true); return
		}
		if (!source.some((entry) => entry.value === value && !entry.disabled)) return
		setValues([...store.getState().values, value])
		config.onAdd?.(value)
		config.onChange?.(store.getState().values)
		clearQuery(); close(true)
	}
	const create = () => {
		if (disabled || !config.onCreate) return
		const query = store.getState().query.trim()
		close()
		config.onCreate(query)
	}
	const focusOption = async(last = false) => {
		if (disabled) return
		store.setState({open: true})
		const revision = ++focusRevision
		// Allow adapters to render the newly opened list before moving focus.
		await Promise.resolve(); await Promise.resolve()
		if (destroyed || revision !== focusRevision) return
		const entries = (config.getOptions?.() ?? []).filter((entry) => entry.getAttribute('aria-disabled') !== 'true' && !entry.hasAttribute('disabled'))
		entries[last ? entries.length - 1 : 0]?.focus()
	}
	const checkFocus = () => {
		const root = config.getRoot?.()
		if (!destroyed && !root?.contains(root.ownerDocument.activeElement)) close()
	}
	refresh()
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		close, clearQuery, setValues, toggle, remove, create,
		setQuery(query: string) {
			if (disabled) return
			store.setState({query, open: true}); refresh()
		},
		open() { if (!disabled) store.setState({open: true}) },
		configure(next: Pick<SearchableMultiSelectOptions, 'options' | 'values' | 'disabled' | 'hideSelected' | 'restoreFocusOnRemove' | 'clearQueryOnEscape' | 'persistentQueryResults' | 'filter' | 'limit'>) {
			const nextLimit = next.limit ?? Number.MAX_SAFE_INTEGER
			checkLimit(nextLimit)
			source = snapshotSelectOptions(next.options)
			disabled = next.disabled ?? false
			hideSelected = next.hideSelected ?? false
			restoreFocusOnRemove = next.restoreFocusOnRemove ?? true
			clearQueryOnEscape = next.clearQueryOnEscape ?? false
			persistentQueryResults = next.persistentQueryResults ?? false
			match = next.filter
			limit = nextLimit
			setValues(next.values ?? [])
			if (disabled) close()
		},
		onPointerDown() {
			releasePointer?.()
			const document = config.getRoot?.()?.ownerDocument
			if (!document || disabled) return
			pointerPending = true
			const finish = () => {
				releasePointer?.()
				clearTimeout(blurTimer)
				blurTimer = setTimeout(checkFocus, 0)
			}
			releasePointer = () => {
				pointerPending = false
				document.removeEventListener('pointerup', finish)
				document.removeEventListener('pointercancel', finish)
				releasePointer = undefined
			}
			document.addEventListener('pointerup', finish, {once: true})
			document.addEventListener('pointercancel', finish, {once: true})
		},
		onFocusOut() {
			if (pointerPending) return
			const revision = ++focusRevision
			clearTimeout(blurTimer)
			blurTimer = setTimeout(() => {
				if (revision === focusRevision) checkFocus()
			})
		},
		onInputKeydown(event: KeyboardEvent) {
			if (disabled || event.isComposing) return
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault(); void focusOption(event.key === 'ArrowUp')
			} else if (event.key === 'Escape' && store.getState().open) {
				event.preventDefault(); event.stopPropagation()
				if (clearQueryOnEscape) clearQuery()
				close()
			} else if (event.key === 'Enter') {
				event.preventDefault()
				const first = store.getState().options.find((entry) => !entry.disabled)
				if (first) toggle(first.value); else create()
			}
		},
		onListKeydown(event: KeyboardEvent) {
			if (disabled || event.isComposing) return
			if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
			const entries = (config.getOptions?.() ?? []).filter((entry) => entry.getAttribute('aria-disabled') !== 'true' && !entry.hasAttribute('disabled'))
			const index = entries.indexOf(event.target as HTMLElement)
			const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : event.key === 'ArrowDown' ? (index + 1) % entries.length : event.key === 'ArrowUp' ? (index - 1 + entries.length) % entries.length : -1
			if (next >= 0 && entries.length) { event.preventDefault(); entries[next]?.focus() }
		},
		destroy() {
			destroyed = true; focusRevision++; clearTimeout(blurTimer)
			releasePointer?.(); store.setState({open: false}); store.clear()
		}
	}
}
export type SearchableMultiSelectController = ReturnType<
	typeof createSearchableMultiSelectController
>
