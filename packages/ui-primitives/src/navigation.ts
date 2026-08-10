import {createControllerStore, type Subscriber} from './store'

export type TabsMode = 'panels' | 'navigation'
export type TabsActivation = 'automatic' | 'manual'
export type TabsState = {activeId: string; focusedId: string; mounted: boolean}
export type TabsControllerOptions = {
	activeId: string
	defaultActiveId?: string
	mode?: TabsMode
	activation?: TabsActivation
	orientation?: 'horizontal' | 'vertical'
	loop?: boolean
	getTabs: () => ReadonlyArray<HTMLElement>
	getPanels?: () => ReadonlyArray<HTMLElement>
	onChange?: (id: string) => void
}

export const createTabsController = (options: TabsControllerOptions) => {
	let mode = options.mode ?? 'panels'
	let activation = options.activation ?? 'automatic'
	let orientation = options.orientation ?? 'horizontal'
	let loop = options.loop ?? true
	const initial = options.activeId || options.defaultActiveId || ''
	const store = createControllerStore<TabsState>({
		activeId: initial,
		focusedId: initial,
		mounted: false
	})
	const enabled = () =>
		options
			.getTabs()
			.filter(
				(tab) => tab.getAttribute('aria-disabled') !== 'true' && !tab.hasAttribute('disabled')
			)
	const idOf = (tab: HTMLElement) => tab.dataset.value ?? tab.id
	const sync = () => {
		const state = store.getState()
		options.getTabs().forEach((tab) => {
			const active = idOf(tab) === state.activeId
			tab.tabIndex = idOf(tab) === state.focusedId ? 0 : -1
			if (mode === 'panels') tab.setAttribute('aria-selected', String(active))
			else if (active) tab.setAttribute('aria-current', 'page')
			else tab.removeAttribute('aria-current')
			tab.dataset.active = String(active)
		})
		options.getPanels?.().forEach((panel) => {
			const active = panel.dataset.value === state.activeId
			panel.hidden = !active
			panel.dataset.active = String(active)
		})
	}
	const setActive = (activeId: string, emit = false) => {
		if (!enabled().some((tab) => idOf(tab) === activeId)) return
		store.setState({activeId, focusedId: activeId})
		sync()
		if (emit) options.onChange?.(activeId)
	}
	const focus = (tab: HTMLElement) => {
		const id = idOf(tab)
		store.setState({focusedId: id})
		sync()
		tab.focus()
		if (
			activation === 'automatic' &&
			mode === 'panels'
		)
			setActive(id, true)
	}
	const move = (current: HTMLElement, direction: 1 | -1) => {
		const tabs = enabled()
		const position = tabs.indexOf(current)
		const nextPosition = position + direction
		const next =
			tabs[nextPosition] ??
			(!loop ? current : direction === 1 ? tabs[0] : tabs.at(-1))
		if (next) focus(next)
	}
	const onClick = (event: MouseEvent) => {
		const tab = (event.target as Element | null)?.closest<HTMLElement>('[data-tab]')
		if (!tab || tab.getAttribute('aria-disabled') === 'true') return
		if (mode === 'panels') event.preventDefault()
		setActive(idOf(tab), true)
	}
	const onKey = (event: KeyboardEvent) => {
		const tab = (event.target as Element | null)?.closest<HTMLElement>('[data-tab]')
		if (!tab) return
		const horizontal = orientation === 'horizontal'
		if (event.key === (horizontal ? 'ArrowRight' : 'ArrowDown')) {
			event.preventDefault()
			move(tab, 1)
		} else if (event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp')) {
			event.preventDefault()
			move(tab, -1)
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault()
			const next = event.key === 'Home' ? enabled()[0] : enabled().at(-1)
			if (next) focus(next)
		} else if (
			(event.key === 'Enter' || event.key === ' ') &&
			activation === 'manual'
		) {
			event.preventDefault()
			setActive(idOf(tab), true)
		}
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe as (subscriber: Subscriber<TabsState>) => () => void,
		mount() {
			if (store.getState().mounted) return
			const root = options.getTabs()[0]?.parentElement
			if (!root) return
			root.addEventListener('click', onClick)
			root.addEventListener('keydown', onKey)
			store.setState({mounted: true})
			sync()
		},
		setActive,
		configure(next: Pick<TabsControllerOptions, 'mode' | 'activation' | 'orientation' | 'loop'>) {
			mode = next.mode ?? 'panels'
			activation = next.activation ?? 'automatic'
			orientation = next.orientation ?? 'horizontal'
			loop = next.loop ?? true
			sync()
		},
		refresh() {
			const current = store.getState().activeId
			if (!enabled().some((tab) => idOf(tab) === current)) {
				const fallback = enabled()[0]
				const next = fallback ? idOf(fallback) : ''
				store.setState({activeId: next, focusedId: next})
				if (next !== current) options.onChange?.(next)
			}
			sync()
		},
		destroy() {
			const root = options.getTabs()[0]?.parentElement
			root?.removeEventListener('click', onClick)
			root?.removeEventListener('keydown', onKey)
			store.setState({mounted: false})
			store.clear()
		}
	}
}

export type AccordionState = {openIds: ReadonlyArray<string>; mounted: boolean}
export type AccordionControllerOptions = {
	openIds?: ReadonlyArray<string>
	defaultOpenIds?: ReadonlyArray<string>
	type?: 'single' | 'multiple'
	collapsible?: boolean
	getTriggers: () => ReadonlyArray<HTMLElement>
	getPanels: () => ReadonlyArray<HTMLElement>
	onChange?: (openIds: ReadonlyArray<string>) => void
}

export const createAccordionController = (options: AccordionControllerOptions) => {
	const normalize = (ids: ReadonlyArray<string>) =>
		Object.freeze((options.type ?? 'single') === 'single' ? ids.slice(0, 1) : [...new Set(ids)])
	const initial = normalize(options.openIds ?? options.defaultOpenIds ?? [])
	const store = createControllerStore<AccordionState>({openIds: initial, mounted: false})
	const idOf = (trigger: HTMLElement) => trigger.dataset.value ?? trigger.id
	const sync = () => {
		const open = store.getState().openIds
		options.getTriggers().forEach((trigger) => {
			const expanded = open.includes(idOf(trigger))
			trigger.setAttribute('aria-expanded', String(expanded))
			trigger.dataset.state = expanded ? 'open' : 'closed'
		})
		options.getPanels().forEach((panel) => {
			const expanded = open.includes(panel.dataset.value ?? '')
			panel.hidden = !expanded
			panel.dataset.state = expanded ? 'open' : 'closed'
		})
	}
	const setOpenIds = (ids: ReadonlyArray<string>, emit = false) => {
		const openIds = normalize(ids)
		store.setState({openIds})
		sync()
		if (emit) options.onChange?.(openIds)
	}
	const toggle = (id: string) => {
		const current = store.getState().openIds
		if (current.includes(id)) {
			if (options.collapsible === false && (options.type ?? 'single') === 'single') return
			setOpenIds(
				current.filter((entry) => entry !== id),
				true
			)
		} else setOpenIds((options.type ?? 'single') === 'single' ? [id] : [...current, id], true)
	}
	const enabled = () =>
		options
			.getTriggers()
			.filter(
				(trigger) =>
					!trigger.hasAttribute('disabled') && trigger.getAttribute('aria-disabled') !== 'true'
			)
	const onClick = (event: MouseEvent) => {
		const trigger = (event.target as Element | null)?.closest<HTMLElement>(
			'[data-accordion-trigger]'
		)
		if (trigger) toggle(idOf(trigger))
	}
	const onKey = (event: KeyboardEvent) => {
		const trigger = (event.target as Element | null)?.closest<HTMLElement>(
			'[data-accordion-trigger]'
		)
		if (!trigger) return
		const triggers = enabled()
		const index = triggers.indexOf(trigger)
		const next =
			event.key === 'Home'
				? triggers[0]
				: event.key === 'End'
					? triggers.at(-1)
					: event.key === 'ArrowDown'
						? triggers[(index + 1) % triggers.length]
						: event.key === 'ArrowUp'
							? triggers[(index - 1 + triggers.length) % triggers.length]
							: undefined
		if (next) {
			event.preventDefault()
			next.focus()
		}
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe as (subscriber: Subscriber<AccordionState>) => () => void,
		mount() {
			if (store.getState().mounted) return
			const root = options.getTriggers()[0]?.closest<HTMLElement>('[data-accordion-root]')
			if (!root) return
			root.addEventListener('click', onClick)
			root.addEventListener('keydown', onKey)
			store.setState({mounted: true})
			sync()
		},
		toggle,
		setOpenIds,
		destroy() {
			const root = options.getTriggers()[0]?.closest<HTMLElement>('[data-accordion-root]')
			root?.removeEventListener('click', onClick)
			root?.removeEventListener('keydown', onKey)
			store.setState({mounted: false})
			store.clear()
		}
	}
}
