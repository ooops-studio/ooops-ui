import {createLayerController, type LayerController, type LayerCloseReason} from './layer'
import {createControllerStore, type Subscriber} from './store'

export type MenuState = {open: boolean; activeIndex: number; mounted: boolean}
export type MenuControllerOptions = {
	open?: boolean
	loop?: boolean
	/** Native hosts retain click handlers and selection state. */
	activation?: 'controller' | 'native'
	triggerEvents?: boolean
	positioning?: boolean
	manageVisibility?: boolean
	captureEscape?: boolean
	capturePointer?: boolean
	closeOnEscape?: boolean
	closeOnOutsidePointer?: boolean
	closeOnOutsideFocus?: boolean
	isTargetInside?: (target: EventTarget | null) => boolean
	placement?: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	offset?: number
	zIndex?: number
	matchAnchorWidth?: boolean
	beforeClose?: (reason: LayerCloseReason, event?: Event) => boolean | void
	portal?: boolean
	getPortalRoot?: () => HTMLElement | null | undefined
	getTrigger: () => HTMLElement | null | undefined
	getMenu: () => HTMLElement | null | undefined
	getItems: () => ReadonlyArray<HTMLElement>
	getSubmenu?: (item: HTMLElement) => HTMLElement | null | undefined
	onOpenChange?: (open: boolean) => void
	onSelect?: (item: HTMLElement) => void
}

const enabledItems = (items: ReadonlyArray<HTMLElement>) =>
	items.filter(
		(item) =>
			item.getAttribute('aria-disabled') !== 'true' &&
			!item.hasAttribute('disabled') &&
			!item.closest('[hidden]')
	)

export const createMenuController = (options: MenuControllerOptions) => {
	const store = createControllerStore<MenuState>({
		open: options.open ?? false,
		activeIndex: -1,
		mounted: false
	})
	let typeahead = ''
	let typeaheadTimer: number | undefined
	let focusFrame: number | undefined
	const submenuLayers = new Map<HTMLElement, LayerController>()
	const layer = createLayerController({
		getAnchor: options.getTrigger,
		...(options.placement === undefined ? {} : {placement: options.placement}),
		...(options.align === undefined ? {} : {align: options.align}),
		...(options.offset === undefined ? {} : {offset: options.offset}),
		...(options.zIndex === undefined ? {} : {zIndex: options.zIndex}),
		...(options.matchAnchorWidth === undefined ? {} : {matchAnchorWidth: options.matchAnchorWidth}),
		beforeClose: (reason, event) => {
			if (options.beforeClose?.(reason, event) !== false) return true
			options.onOpenChange?.(true)
			return false
		},
		getLayer: options.getMenu,
		...(options.portal === undefined ? {} : {portal: options.portal}),
		...(options.getPortalRoot ? {getPortalRoot: options.getPortalRoot} : {}),
		get positioning() { return options.positioning ?? true },
		get manageVisibility() { return options.manageVisibility ?? true },
		get captureEscape() { return options.captureEscape ?? true },
		get capturePointer() { return options.capturePointer ?? true },
		get closeOnEscape() { return options.closeOnEscape ?? true },
		get closeOnOutsidePointer() { return options.closeOnOutsidePointer ?? true },
		get closeOnOutsideFocus() { return options.closeOnOutsideFocus ?? true },
		...(options.isTargetInside ? {isTargetInside: options.isTargetInside} : {}),
		onClose: () => {
			cancelScheduledFocus()
			closeSubmenus()
			store.setState({open: false, activeIndex: -1})
			sync()
			options.onOpenChange?.(false)
		}
	})
	const sync = () => {
		const state = store.getState()
		options.getTrigger()?.setAttribute('aria-expanded', String(state.open))
		options.getItems().forEach((item, index) => {
			item.tabIndex = index === state.activeIndex ? 0 : -1
			item.dataset.active = String(index === state.activeIndex)
		})
	}
	const setActiveIndex = (index: number, focus = true) => {
		const items = options.getItems()
		if (!items[index] || !enabledItems(items).includes(items[index]!)) return
		store.setState({activeIndex: index})
		sync()
		if (focus) items[index]?.focus()
	}
	const currentItems = () => {
		const activeElement = options.getMenu()?.ownerDocument.activeElement as Element | null
		const activeMenu = activeElement?.closest('[role="menu"]')
		const scope = activeMenu && options.getMenu()?.contains(activeMenu)
			? activeMenu : options.getMenu()
		return enabledItems(options.getItems()).filter((item) => (item.closest('[role="menu"]') ?? options.getMenu()) === scope)
	}
	const first = () => {
		const item = currentItems()[0]
		if (item) setActiveIndex(options.getItems().indexOf(item))
	}
	const last = () => {
		const item = currentItems().at(-1)
		if (item) setActiveIndex(options.getItems().indexOf(item))
	}
	const move = (direction: 1 | -1) => {
		const enabled = currentItems()
		if (!enabled.length) return
		const current = options.getItems()[store.getState().activeIndex]
		const position = Math.max(0, enabled.indexOf(current!))
		const next = enabled[(position + direction + enabled.length) % enabled.length]
		const bounded = position + direction
		if (options.loop === false && (bounded < 0 || bounded >= enabled.length)) return
		if (next) setActiveIndex(options.getItems().indexOf(next))
	}
	const cancelScheduledFocus = () => {
		if (focusFrame === undefined) return
		window.cancelAnimationFrame(focusFrame)
		focusFrame = undefined
	}
	const open = (focus = true) => {
		if (store.getState().open) return
		store.setState({open: true})
		layer.open()
		options.onOpenChange?.(true)
		sync()
		if (focus)
			focusFrame = window.requestAnimationFrame(() => {
				focusFrame = undefined
				first()
			})
	}
	const closeSubmenus = () => {
		for (const item of options.getItems()) {
			if (item.getAttribute('aria-haspopup') !== 'menu') continue
			submenuLayers.get(item)?.close()
		}
	}
	const close = (restoreFocus = true) => {
		if (!store.getState().open) return
		cancelScheduledFocus()
		layer.close()
		if (layer.isOpen()) return
		store.setState({open: false, activeIndex: -1})
		sync()
		if (restoreFocus) options.getTrigger()?.focus()
	}
	const select = (item: HTMLElement) => {
		if (item.getAttribute('aria-disabled') === 'true' || item.hasAttribute('disabled')) return
		if (options.activation === 'native') { item.click(); return }
		if (item.getAttribute('aria-haspopup') === 'menu') {
			const submenu = options.getSubmenu?.(item)
			const submenuLayer = submenuLayers.get(item)
			if (submenu && submenuLayer) {
				item.setAttribute('aria-expanded', 'true')
				submenuLayer.open()
				const firstItem = enabledItems(options.getItems()).find((entry) => entry.closest('[role="menu"]') === submenu)
				if (firstItem) setActiveIndex(options.getItems().indexOf(firstItem))
			}
			return
		}
		if (item.getAttribute('role') === 'menuitemcheckbox')
			item.setAttribute('aria-checked', String(item.getAttribute('aria-checked') !== 'true'))
		if (item.getAttribute('role') === 'menuitemradio') {
			for (const sibling of options
				.getItems()
				.filter(
					(entry) =>
						entry.getAttribute('role') === 'menuitemradio' &&
						entry.dataset.group === item.dataset.group
				))
				sibling.setAttribute('aria-checked', String(sibling === item))
		}
		options.onSelect?.(item)
		item.dispatchEvent(
			new CustomEvent('ooops:menu-select', {
				bubbles: true,
				detail: {value: item.dataset.value ?? null}
			})
		)
		if (item.dataset.keepOpen !== 'true') close()
	}
	const onTrigger = () => (store.getState().open ? close(false) : open())
	const onKey = (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		const target = event.target as Element | null
		if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
		cancelScheduledFocus()
		const item = (event.target as Element | null)?.closest<HTMLElement>('[role^="menuitem"]')
		const rtl = getComputedStyle(options.getMenu() ?? item ?? document.documentElement).direction === 'rtl'
		const openSubmenuKey = rtl ? 'ArrowLeft' : 'ArrowRight'
		const closeSubmenuKey = rtl ? 'ArrowRight' : 'ArrowLeft'
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			if (!store.getState().open) open()
			else move(1)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			if (!store.getState().open) {
				open(false)
				requestAnimationFrame(last)
			} else move(-1)
		} else if (event.key === 'Home') {
			event.preventDefault()
			first()
		} else if (event.key === 'End') {
			event.preventDefault()
			last()
		} else if (event.key === 'Enter' || event.key === ' ') {
			if (item) {
				event.preventDefault()
				select(item)
			}
		} else if (event.key === openSubmenuKey && item?.getAttribute('aria-haspopup') === 'menu') {
			event.preventDefault()
			select(item)
		} else if (event.key === closeSubmenuKey) {
			const submenu = item?.closest<HTMLElement>('[data-submenu="true"]')
			const owner = submenu?.previousElementSibling as HTMLElement | null
			if (submenu && owner) {
				event.preventDefault()
				submenuLayers.get(owner)?.close()
				setActiveIndex(options.getItems().indexOf(owner))
			} else if (options.activation === 'native' && options.getTrigger()?.closest('[role="menu"]')) {
				event.preventDefault()
				close()
			}
		} else if (event.key === 'Tab') {
			options.getTrigger()?.focus()
			close(false)
		} else if (event.key.length === 1 && event.key.trim()) {
			window.clearTimeout(typeaheadTimer)
			typeahead += event.key.toLocaleLowerCase()
			const match = currentItems().find((entry) =>
				(entry.dataset.label ?? entry.textContent ?? '')
					.trim()
					.toLocaleLowerCase()
					.startsWith(typeahead)
			)
			if (match) setActiveIndex(options.getItems().indexOf(match))
			typeaheadTimer = window.setTimeout(() => {
				typeahead = ''
			}, 700)
		}
	}
	const onPointer = (event: PointerEvent) => {
		const item = (event.target as Element | null)?.closest<HTMLElement>('[role^="menuitem"]')
		if (!item) return
		setActiveIndex(options.getItems().indexOf(item), false)
		if (event.type === 'pointerup' && options.activation !== 'native') select(item)
	}
	const onFocusIn = (event: FocusEvent) => {
		cancelScheduledFocus()
		const item = (event.target as Element | null)?.closest<HTMLElement>('[role^="menuitem"]')
		if (item) setActiveIndex(options.getItems().indexOf(item), false)
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe as (subscriber: Subscriber<MenuState>) => () => void,
		mount() {
			if (store.getState().mounted) return
			const trigger = options.getTrigger()
			const menu = options.getMenu()
			if (!trigger || !menu) return
			layer.mount()
			if (options.triggerEvents !== false) {
				trigger.addEventListener('click', onTrigger)
				trigger.addEventListener('keydown', onKey)
			}
			menu.addEventListener('keydown', onKey)
			menu.addEventListener('focusin', onFocusIn)
			menu.addEventListener('pointermove', onPointer)
			menu.addEventListener('pointerup', onPointer)
			for (const item of options.getItems()) {
				if (item.getAttribute('aria-haspopup') !== 'menu') continue
				const submenu = options.getSubmenu?.(item)
				if (!submenu) continue
				const submenuLayer = createLayerController({
					getAnchor: () => item,
					getLayer: () => submenu,
					placement: getComputedStyle(item).direction === 'rtl' ? 'left' : 'right',
					align: 'start',
					offset: 4,
					portal: false,
					onClose: () => item.setAttribute('aria-expanded', 'false')
				})
				submenuLayer.mount()
				submenuLayers.set(item, submenuLayer)
			}
			store.setState({mounted: true})
			if (store.getState().open) {
				store.setState({open: false})
				open(false)
			}
			sync()
		},
		open,
		close,
		move,
		select,
		setActiveIndex,
		destroy() {
			const trigger = options.getTrigger()
			const menu = options.getMenu()
			trigger?.removeEventListener('click', onTrigger)
			trigger?.removeEventListener('keydown', onKey)
			menu?.removeEventListener('keydown', onKey)
			menu?.removeEventListener('focusin', onFocusIn)
			menu?.removeEventListener('pointermove', onPointer)
			menu?.removeEventListener('pointerup', onPointer)
			window.clearTimeout(typeaheadTimer)
			cancelScheduledFocus()
			for (const submenuLayer of submenuLayers.values()) submenuLayer.destroy()
			submenuLayers.clear()
			layer.destroy()
			store.setState({mounted: false, open: false})
			store.clear()
		}
	}
}

export type TooltipControllerOptions = {
	getTrigger: () => HTMLElement | null | undefined
	getTooltip: () => HTMLElement | null | undefined
	portal?: boolean
	getPortalRoot?: () => HTMLElement | null | undefined
	/** Disable geometry writes when a host retains its existing presentation. */
	positioning?: boolean
	openDelayMs?: number
	closeDelayMs?: number
	touch?: 'disabled' | 'longpress'
	focusMode?: 'always' | 'keyboard'
	shouldOpen?: () => boolean
	/** Create a lazily rendered tooltip before the shared layer opens. */
	onBeforeOpen?: () => void
	onOpenChange?: (open: boolean) => void
	describeWhenOpen?: boolean
	/** Dismiss on pointer activation, click, scroll and resize. */
	dismissOnInteraction?: boolean
}

export const createTooltipController = (options: TooltipControllerOptions) => {
	let openTimer: number | undefined
	let closeTimer: number | undefined
	let longPressTimer: number | undefined
	let mountedTrigger: HTMLElement | null = null
	let boundTooltip: HTMLElement | null = null
	let descriptionTarget: HTMLElement | null = null
	let descriptionId: string | null = null
	let ownsDescription = false
	let triggerHovered = false
	let tooltipHovered = false
	let focused = false
	let dismissed = false
	let keyboardFocusPending = false
	const store = createControllerStore({open: false, mounted: false})
	const clearTimers = () => {
		if (typeof window === 'undefined') return
		window.clearTimeout(openTimer)
		window.clearTimeout(closeTimer)
		window.clearTimeout(longPressTimer)
		openTimer = closeTimer = longPressTimer = undefined
	}
	const removeDescription = () => {
		if (descriptionTarget && descriptionId && ownsDescription) {
			const ids = (descriptionTarget.getAttribute('aria-describedby') ?? '')
				.split(/\s+/).filter((id) => id && id !== descriptionId)
			if (ids.length) descriptionTarget.setAttribute('aria-describedby', ids.join(' '))
			else descriptionTarget.removeAttribute('aria-describedby')
		}
		descriptionId = null
		ownsDescription = false
	}
	const addDescription = () => {
		const id = boundTooltip?.id
		if (!id || !descriptionTarget || descriptionId === id) return
		removeDescription()
		const ids = new Set((descriptionTarget.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean))
		descriptionId = id
		ownsDescription = !ids.has(id)
		ids.add(id)
		descriptionTarget.setAttribute('aria-describedby', [...ids].join(' '))
	}
	const finishClose = (reason: LayerCloseReason) => {
		if (reason === 'escape') dismissed = true
		clearTimers()
		tooltipHovered = false
		const wasOpen = store.getState().open
		store.setState({open: false})
		if (options.describeWhenOpen) removeDescription()
		if (wasOpen) options.onOpenChange?.(false)
	}
	const layer = createLayerController({
		getAnchor: () => mountedTrigger,
		getLayer: options.getTooltip,
		...(options.portal === undefined ? {} : {portal: options.portal}),
		...(options.getPortalRoot ? {getPortalRoot: options.getPortalRoot} : {}),
		...(options.positioning === undefined ? {} : {positioning: options.positioning}),
		placement: 'top', align: 'center', closeOnOutsidePointer: false,
		restoreFocusOnEscape: false,
		onClose: finishClose
	})
	const onTooltipEnter = () => {
		tooltipHovered = true
		window.clearTimeout(closeTimer)
		closeTimer = undefined
	}
	const onTooltipLeave = () => { tooltipHovered = false; closeIfInactive() }
	const detachTooltip = () => {
		boundTooltip?.removeEventListener('pointerenter', onTooltipEnter)
		boundTooltip?.removeEventListener('pointerleave', onTooltipLeave)
		removeDescription()
		boundTooltip = null
	}
	const bindTooltip = () => {
		const tooltip = options.getTooltip() ?? null
		if (tooltip === boundTooltip) return
		detachTooltip()
		boundTooltip = tooltip
		tooltip?.addEventListener('pointerenter', onTooltipEnter)
		tooltip?.addEventListener('pointerleave', onTooltipLeave)
		if (!options.describeWhenOpen) addDescription()
	}
	const show = () => {
		openTimer = longPressTimer = undefined
		if (!store.getState().mounted || dismissed || options.shouldOpen?.() === false) return
		options.onBeforeOpen?.()
		bindTooltip()
		if (!boundTooltip) return
		layer.open()
		if (!layer.isOpen()) return
		store.setState({open: true})
		addDescription()
		options.onOpenChange?.(true)
	}
	const scheduleOpen = () => {
		if (!store.getState().mounted || dismissed || options.shouldOpen?.() === false) return
		window.clearTimeout(closeTimer)
		closeTimer = undefined
		if (store.getState().open || openTimer !== undefined) return
		openTimer = window.setTimeout(show, options.openDelayMs ?? 500)
	}
	const close = () => {
		clearTimers()
		closeTimer = window.setTimeout(() => {
			closeTimer = undefined
			if (!store.getState().mounted) return
			layer.close()
		}, options.closeDelayMs ?? 80)
	}
	const dismiss = () => {
		dismissed = true
		clearTimers()
		layer.close()
	}
	const closeIfInactive = () => {
		if (!triggerHovered && !tooltipHovered && !focused) close()
	}
	const onPointerDown = (event: PointerEvent) => {
		if (options.touch === 'longpress' && event.pointerType === 'touch') {
			window.clearTimeout(longPressTimer)
			dismissed = false
			longPressTimer = window.setTimeout(show, 500)
		}
	}
	const onPointerUp = () => {
		window.clearTimeout(longPressTimer)
		longPressTimer = undefined
	}
	const onPointerEnter = (event: PointerEvent) => {
		if (event.pointerType === 'touch') return
		if (window.matchMedia?.('(pointer: coarse)').matches && options.touch !== 'longpress') return
		triggerHovered = true
		dismissed = false
		scheduleOpen()
	}
	const onPointerLeave = () => { triggerHovered = false; closeIfInactive() }
	const onFocusIn = () => {
		if (options.focusMode === 'keyboard' && !keyboardFocusPending) return
		focused = true
		dismissed = false
		keyboardFocusPending = false
		scheduleOpen()
	}
	const onFocusOut = (event: FocusEvent) => {
		const next = event.relatedTarget
		if (next instanceof Node && mountedTrigger?.contains(next)) return
		focused = false
		if (!store.getState().open) dismissed = false
		closeIfInactive()
	}
	const onKeydown = (event: KeyboardEvent) => {
		keyboardFocusPending = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
		if (event.key === 'Escape' && !store.getState().open &&
			(openTimer !== undefined || longPressTimer !== undefined)) dismiss()
		// An invisible tooltip must not consume the enclosing dialog's Escape.
	}
	const onDocumentPointer = () => {
		keyboardFocusPending = false
		if (options.dismissOnInteraction) dismiss()
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount() {
			if (store.getState().mounted) return
			const trigger = options.getTrigger()
			if (!trigger || (!options.getTooltip() && !options.onBeforeOpen)) return
			mountedTrigger = trigger
			dismissed = false
			descriptionTarget = trigger.matches(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
			) ? trigger : trigger.querySelector<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
				) ?? trigger
			bindTooltip()
			layer.mount()
			trigger.addEventListener('pointerenter', onPointerEnter)
			trigger.addEventListener('pointerleave', onPointerLeave)
			trigger.addEventListener('focusin', onFocusIn)
			trigger.addEventListener('focusout', onFocusOut)
			trigger.addEventListener('pointerdown', onPointerDown)
			trigger.addEventListener('pointerup', onPointerUp)
			trigger.addEventListener('pointercancel', onPointerUp)
			trigger.ownerDocument.addEventListener('keydown', onKeydown, true)
			trigger.ownerDocument.addEventListener('pointerdown', onDocumentPointer, true)
			if (options.dismissOnInteraction) {
				trigger.addEventListener('click', dismiss)
				trigger.ownerDocument.defaultView?.addEventListener('scroll', dismiss, true)
				trigger.ownerDocument.defaultView?.addEventListener('resize', dismiss)
			}
			store.setState({mounted: true})
		},
		open: () => { dismissed = false; scheduleOpen() },
		close,
		dismiss,
		refresh() {
			if (options.shouldOpen?.() === false) dismiss()
			else layer.update()
		},
		destroy() {
			const trigger = mountedTrigger
			trigger?.removeEventListener('pointerenter', onPointerEnter)
			trigger?.removeEventListener('pointerleave', onPointerLeave)
			trigger?.removeEventListener('focusin', onFocusIn)
			trigger?.removeEventListener('focusout', onFocusOut)
			trigger?.removeEventListener('pointerdown', onPointerDown)
			trigger?.removeEventListener('pointerup', onPointerUp)
			trigger?.removeEventListener('pointercancel', onPointerUp)
			trigger?.removeEventListener('click', dismiss)
			trigger?.ownerDocument.removeEventListener('keydown', onKeydown, true)
			trigger?.ownerDocument.removeEventListener('pointerdown', onDocumentPointer, true)
			trigger?.ownerDocument.defaultView?.removeEventListener('scroll', dismiss, true)
			trigger?.ownerDocument.defaultView?.removeEventListener('resize', dismiss)
			clearTimers()
			layer.destroy()
			detachTooltip()
			descriptionTarget = mountedTrigger = null
			triggerHovered = tooltipHovered = focused = false
			store.setState({mounted: false, open: false})
			store.clear()
		}
	}
}
