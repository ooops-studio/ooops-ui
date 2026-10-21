import {createControllerStore} from './store'

export type ButtonState = {disabled: boolean; loading: boolean; mounted: boolean}
export type ButtonOptions = {
	disabled?: boolean | undefined
	loading?: boolean | undefined
	href?: string | null | undefined
	type?: 'button' | 'submit' | 'reset' | undefined
	tabindex?: number | null | undefined
	role?: string | null | undefined
	ariaBusy?: boolean | 'true' | 'false' | null | undefined
	ariaDisabled?: boolean | 'true' | 'false' | null | undefined
}

/** SSR attributes keep disabled/busy links safe even without JavaScript. */
export const getButtonAttributes = (
	options: ButtonOptions = {}, tag: 'button' | 'a' = options.href == null ? 'button' : 'a'
) => {
	const blocked = Boolean(options.disabled || options.loading)
	const common = {
		'aria-busy': options.loading ? 'true' as const : options.ariaBusy == null ? undefined : String(options.ariaBusy) as 'true' | 'false',
		'aria-disabled': blocked ? 'true' as const : options.ariaDisabled == null ? undefined : String(options.ariaDisabled) as 'true' | 'false',
		'data-disabled': String(Boolean(options.disabled)), 'data-loading': String(Boolean(options.loading))}
	if (tag === 'a') return {...common,
		href: blocked ? undefined : options.href ?? undefined, role: blocked ? 'link' as const : undefined,
		tabindex: blocked ? -1 : options.tabindex ?? undefined}
	return {...common, role: undefined, type: options.type ?? 'button', disabled: blocked}
}

export const createButtonController = (options: ButtonOptions & {
	getElement: () => HTMLButtonElement | HTMLAnchorElement | null | undefined
}) => {
	let config = {...options}
	const store = createControllerStore<ButtonState>({disabled: Boolean(options.disabled),
		loading: Boolean(options.loading), mounted: false})
	let element: HTMLButtonElement | HTMLAnchorElement | null = null
	const sync = () => {
		if (!element) return
		const attrs = getButtonAttributes(config, element.tagName === 'A' ? 'a' : 'button')
		for (const [key, value] of Object.entries(attrs)) {
			if (value === undefined || value === false) element.removeAttribute(key)
			else element.setAttribute(key, value === true ? '' : String(value))
		}
		if (config.role) element.setAttribute('role', config.role)
	}
	const guard = (event: Event) => {
		if (!store.getState().disabled && !store.getState().loading) return
		if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return
		event.preventDefault()
		event.stopImmediatePropagation()
	}
	const events = ['click', 'auxclick', 'pointerdown', 'keydown'] as const
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount() {
			if (store.getState().mounted) return
			element = options.getElement() ?? null
			if (!element) return
			config = {...config, role: config.role ?? element.getAttribute('role'),
				href: config.href === undefined ? element.getAttribute('href') : config.href}
			for (const event of events) element.addEventListener(event, guard, true)
			store.setState({mounted: true})
			sync()
		},
		configure(next: ButtonOptions) {
			config = {...config, ...next}
			store.setState({disabled: Boolean(config.disabled), loading: Boolean(config.loading)})
			sync()
		},
		destroy() {
			for (const event of events) element?.removeEventListener(event, guard, true)
			element = null
			store.setState({mounted: false})
			store.clear()
		}
	}
}
