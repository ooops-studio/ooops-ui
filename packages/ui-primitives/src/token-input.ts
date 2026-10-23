import {createControllerStore} from './store'

export type TokenInputState = {
	values: readonly string[]
	query: string
	composing: boolean
	mounted: boolean
}
export type TokenInputOptions = {
	values?: readonly string[]
	disabled?: boolean
	allowDuplicates?: boolean
	delimiters?: readonly string[]
	getInput: () => HTMLInputElement | null | undefined
	onChange?: (values: string[]) => void
}
const normalize = (values: readonly string[]) => values.map((value) => value.trim()).filter(Boolean)
const split = (raw: string) => normalize(raw.split(/[\n,]+/))

/** Free-text tokens own no option catalogue. Markup, labels and hidden fields stay in adapters. */
export function createTokenInputController(initial: TokenInputOptions) {
	let options = {...initial}, disposed = false
	const defaults = Object.freeze(normalize(initial.values ?? []))
	const store = createControllerStore<TokenInputState>({values: defaults, query: '', composing: false, mounted: false})
	let input: HTMLInputElement | null | undefined, form: HTMLFormElement | null | undefined
	let resetTimer: ReturnType<typeof setTimeout> | undefined
	const setQuery = (query: string) => {
		if (disposed) return
		store.setState({query})
		if (input && input.value !== query) input.value = query
	}
	const setValues = (values: readonly string[], emit = false) => {
		if (disposed) return
		const next = normalize(values)
		store.setState({values: Object.freeze([...next])})
		if (emit) options.onChange?.([...next])
	}
	const add = (raw = store.getState().query) => {
		if (disposed || options.disabled || store.getState().composing) return false
		const incoming = split(raw)
		if (!incoming.length) return false
		const next = [...store.getState().values]
		for (const token of incoming) {
			if (options.allowDuplicates || !next.includes(token)) next.push(token)
		}
		setValues(next, true); setQuery(''); return true
	}
	const remove = (token: string) => {
		if (disposed || options.disabled || !store.getState().values.includes(token)) return false
		setValues(store.getState().values.filter((value) => value !== token), true); return true
	}
	const onInput = () => { if (!options.disabled) setQuery(input?.value ?? '') }
	const onKeyDown = (event: KeyboardEvent) => {
		const state = store.getState()
		if (options.disabled || event.isComposing || event.keyCode === 229 || state.composing) return
		if ((options.delimiters ?? [',', 'Enter']).includes(event.key)) {
			if (state.query.trim()) { event.preventDefault(); add() }
		} else if (event.key === 'Backspace' && !state.query && state.values.length) {
			event.preventDefault(); setValues(state.values.slice(0, -1), true)
		}
	}
	const onPaste = (event: ClipboardEvent) => {
		if (options.disabled || store.getState().composing) return
		const text = event.clipboardData?.getData('text') ?? ''
		if (!/[\n,]/.test(text)) return
		event.preventDefault(); add(text)
	}
	const onBlur = () => { add() }
	const onCompositionStart = () => { store.setState({composing: true}) }
	const onCompositionEnd = () => {
		store.setState({composing: false}); onInput()
		if (input?.ownerDocument.activeElement !== input) add()
	}
	const onReset = (event: Event) => {
		clearTimeout(resetTimer)
		resetTimer = setTimeout(() => {
			if (!disposed && !event.defaultPrevented) {
				const changed = JSON.stringify(store.getState().values) !== JSON.stringify(defaults)
				setValues(defaults, changed); setQuery('')
			}
		}, 0)
	}
	return {
		getState: store.getState, subscribe: store.subscribe, setValues, setQuery, add, remove,
		mount() {
			if (disposed || store.getState().mounted) return
			input = options.getInput(); if (!input) return
			form = input.form; input.disabled = options.disabled ?? false
			input.addEventListener('input', onInput); input.addEventListener('keydown', onKeyDown)
			input.addEventListener('paste', onPaste); input.addEventListener('blur', onBlur)
			input.addEventListener('compositionstart', onCompositionStart)
			input.addEventListener('compositionend', onCompositionEnd)
			form?.addEventListener('reset', onReset)
			setQuery(store.getState().query)
			store.setState({mounted: true})
		},
		configure(next: Pick<TokenInputOptions, 'values' | 'disabled' | 'allowDuplicates' | 'delimiters'>) {
			if (disposed) return
			options = {...options, ...next}; setValues(next.values ?? [])
			if (input) input.disabled = options.disabled ?? false
		},
		destroy() {
			disposed = true; clearTimeout(resetTimer)
			input?.removeEventListener('input', onInput); input?.removeEventListener('keydown', onKeyDown)
			input?.removeEventListener('paste', onPaste); input?.removeEventListener('blur', onBlur)
			input?.removeEventListener('compositionstart', onCompositionStart)
			input?.removeEventListener('compositionend', onCompositionEnd)
			form?.removeEventListener('reset', onReset); store.setState({mounted: false}); store.clear()
		}
	}
}
export type TokenInputController = ReturnType<typeof createTokenInputController>
