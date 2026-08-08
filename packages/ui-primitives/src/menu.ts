import {createLayerController, type LayerController} from './layer'
import {createControllerStore, type Subscriber} from './store'

export type MenuState = {open: boolean; activeIndex: number; mounted: boolean}
export type MenuControllerOptions = {
	open?: boolean
	loop?: boolean
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
		getLayer: options.getMenu,
		...(options.portal === undefined ? {} : {portal: options.portal}),
		...(options.getPortalRoot ? {getPortalRoot: options.getPortalRoot} : {}),
		closeOnOutsideFocus: true,
		onClose: () => {
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
	const first = () => {
		const item = enabledItems(options.getItems())[0]
		if (item) setActiveIndex(options.getItems().indexOf(item))
	}
	const last = () => {
		const item = enabledItems(options.getItems()).at(-1)
		if (item) setActiveIndex(options.getItems().indexOf(item))
	}
	const move = (direction: 1 | -1) => {
		const enabled = enabledItems(options.getItems())
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
		closeSubmenus()
		layer.close()
		store.setState({open: false, activeIndex: -1})
		sync()
		if (restoreFocus) options.getTrigger()?.focus()
	}
	const select = (item: HTMLElement) => {
		if (item.getAttribute('aria-disabled') === 'true' || item.hasAttribute('disabled')) return
		if (item.getAttribute('aria-haspopup') === 'menu') {
			const submenu = options.getSubmenu?.(item)
			const submenuLayer = submenuLayers.get(item)
			if (submenu && submenuLayer) {
				item.setAttribute('aria-expanded', 'true')
				submenuLayer.open()
				submenu.querySelector<HTMLElement>('[role^="menuitem"]')?.focus()
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
				owner.focus()
			}
		} else if (event.key === 'Escape') {
			event.preventDefault()
			close()
		} else if (event.key.length === 1 && event.key.trim()) {
			window.clearTimeout(typeaheadTimer)
			typeahead += event.key.toLocaleLowerCase()
			const match = enabledItems(options.getItems()).find((entry) =>
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
		if (event.type === 'pointerup') select(item)
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
			trigger.addEventListener('click', onTrigger)
			trigger.addEventListener('keydown', onKey)
			menu.addEventListener('keydown', onKey)
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
	openDelayMs?: number
	closeDelayMs?: number
	touch?: 'disabled' | 'longpress'
}

export const createTooltipController = (options: TooltipControllerOptions) => {
	let openTimer: number | undefined
	let closeTimer: number | undefined
	let longPressTimer: number | undefined
	const store = createControllerStore({open: false, mounted: false})
	const layer = createLayerController({
		getAnchor: options.getTrigger,
		getLayer: options.getTooltip,
		...(options.portal === undefined ? {} : {portal: options.portal}),
		...(options.getPortalRoot ? {getPortalRoot: options.getPortalRoot} : {}),
		placement: 'top',
		align: 'center',
		closeOnOutsidePointer: false,
		onClose: () => store.setState({open: false})
	})
	const show = () => {
		store.setState({open: true})
		layer.open()
	}
	const open = () => {
		window.clearTimeout(closeTimer)
		openTimer = window.setTimeout(show, options.openDelayMs ?? 500)
	}
	const close = () => {
		window.clearTimeout(openTimer)
		closeTimer = window.setTimeout(() => {
			store.setState({open: false})
			layer.close()
		}, options.closeDelayMs ?? 80)
	}
	const onPointerDown = (event: PointerEvent) => {
		if (options.touch === 'longpress' && event.pointerType === 'touch')
			longPressTimer = window.setTimeout(show, 500)
	}
	const onPointerUp = () => window.clearTimeout(longPressTimer)
	const onPointerEnter = (event: PointerEvent) => {
		if (event.pointerType === 'touch') return
		if (window.matchMedia?.('(pointer: coarse)').matches && options.touch !== 'longpress') return
		open()
	}
	const onFocusIn = () => open()
	const onFocusOut = (event: FocusEvent) => {
		const next = event.relatedTarget
		if (next instanceof Node && options.getTrigger()?.contains(next)) return
		close()
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		mount() {
			if (store.getState().mounted) return
			const trigger = options.getTrigger()
			const tooltip = options.getTooltip()
			if (!trigger || !tooltip) return
			layer.mount()
			trigger.addEventListener('pointerenter', onPointerEnter)
			trigger.addEventListener('pointerleave', close)
			trigger.addEventListener('focusin', onFocusIn)
			trigger.addEventListener('focusout', onFocusOut)
			trigger.addEventListener('pointerdown', onPointerDown)
			trigger.addEventListener('pointerup', onPointerUp)
			trigger.addEventListener('pointercancel', onPointerUp)
			store.setState({mounted: true})
		},
		open,
		close,
		destroy() {
			const trigger = options.getTrigger()
			trigger?.removeEventListener('pointerenter', onPointerEnter)
			trigger?.removeEventListener('pointerleave', close)
			trigger?.removeEventListener('focusin', onFocusIn)
			trigger?.removeEventListener('focusout', onFocusOut)
			trigger?.removeEventListener('pointerdown', onPointerDown)
			trigger?.removeEventListener('pointerup', onPointerUp)
			trigger?.removeEventListener('pointercancel', onPointerUp)
			window.clearTimeout(openTimer)
			window.clearTimeout(closeTimer)
			window.clearTimeout(longPressTimer)
			layer.destroy()
			store.setState({mounted: false, open: false})
			store.clear()
		}
	}
}
