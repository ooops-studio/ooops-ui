import {createFocusTrap, type FocusTrap} from '@ooopsstudio/accessibility'

import {dispatchUiEvent, isBrowser, isNodeInside, nextFrame} from './dom'
import {UI_EVENTS} from './events'
import {createLayerController} from './layer'
import {createControllerStore, type Subscriber} from './store'

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right'
export type PopoverAlign = 'start' | 'center' | 'end'
export type PopoverCloseReason = 'outside-pointer' | 'outside-focus' | 'escape' | 'close'

export type PopoverState = {
	open: boolean
	placement: PopoverPlacement
	mounted: boolean
}

export type PopoverControllerOptions = {
	open?: boolean
	placement?: PopoverPlacement
	align?: PopoverAlign
	offset?: number
	viewportPadding?: number
	zIndex?: number
	closeOnOutsidePointer?: boolean
	closeOnOutsideFocus?: boolean
	closeOnEscape?: boolean
	focusOnOpen?: boolean
	trapFocus?: boolean
	getRoot: () => HTMLElement | null | undefined
	getAnchor: () => HTMLElement | null | undefined
	getPanel: () => HTMLElement | null | undefined
	getInitialFocus?: () => HTMLElement | null | undefined
	isTargetInside?: (target: EventTarget | null) => boolean
	onOpenChange?: (open: boolean) => void
	onClose?: (reason: PopoverCloseReason) => void
}

export type PopoverController = {
	getState: () => PopoverState
	subscribe: (subscriber: Subscriber<PopoverState>) => () => void
	mount: () => void
	destroy: () => void
	open: () => void
	close: (reason?: PopoverCloseReason) => void
	toggle: () => void
	updatePosition: () => void
}

export const createPopoverController = (config: PopoverControllerOptions): PopoverController => {
	let mounted = false
	let focusTrap: FocusTrap | null = null
	const store = createControllerStore<PopoverState>({
		open: config.open ?? false,
		placement: config.placement ?? 'bottom',
		mounted: false
	})

	const syncDom = () => {
		const state = store.getState()
		const panel = config.getPanel()
		config.getRoot()?.setAttribute('data-state', state.open ? 'open' : 'closed')
		config.getAnchor()?.setAttribute('aria-expanded', String(state.open))
		if (panel) {
			panel.hidden = !state.open
			panel.setAttribute('data-state', state.open ? 'open' : 'closed')
			panel.setAttribute('data-placement', state.placement)
		}
	}

	const finishClose = (reason: PopoverCloseReason) => {
		if (!store.getState().open) return
		store.setState({open: false})
		focusTrap?.deactivate()
		syncDom()
		config.onOpenChange?.(false)
		config.onClose?.(reason)
		dispatchUiEvent(config.getRoot(), UI_EVENTS.popoverClose, {reason})
	}
	const layer = createLayerController({
		getAnchor: config.getAnchor,
		getLayer: config.getPanel,
		...(config.placement ? {placement: config.placement} : {}),
		...(config.align ? {align: config.align} : {}),
		...(config.offset === undefined ? {} : {offset: config.offset}),
		...(config.viewportPadding === undefined
			? {}
			: {viewportPadding: config.viewportPadding}),
		...(config.zIndex === undefined ? {} : {zIndex: config.zIndex}),
		...(config.closeOnEscape === undefined ? {} : {closeOnEscape: config.closeOnEscape}),
		...(config.closeOnOutsidePointer === undefined
			? {}
			: {closeOnOutsidePointer: config.closeOnOutsidePointer}),
		...(config.closeOnOutsideFocus === undefined
			? {}
			: {closeOnOutsideFocus: config.closeOnOutsideFocus}),
		isTargetInside: (target) =>
			config.isTargetInside?.(target) ??
			isNodeInside(target, [config.getRoot(), config.getAnchor(), config.getPanel()]),
		onPosition: ({placement}) => {
			store.setState({placement})
			syncDom()
		},
		onClose: (reason) => finishClose(reason)
	})
	const updatePosition = layer.update

	const open = () => {
		if (store.getState().open) return
		store.setState({open: true})
		layer.open()
		config.onOpenChange?.(true)
		nextFrame(() => {
			if (config.focusOnOpen || config.trapFocus) focusTrap?.activate()
		})
	}

	const close = (reason: PopoverCloseReason = 'close') => {
		if (!store.getState().open) return
		layer.close(reason)
	}

	const mount = () => {
		if (mounted || !isBrowser()) return
		const anchor = config.getAnchor()
		const panel = config.getPanel()
		if (!anchor || !panel) return
		mounted = true
		focusTrap = createFocusTrap({
			modal: false,
			containFocus: config.trapFocus === true,
			getContainer: config.getPanel,
			getRestoreFocusTo: config.getAnchor,
			...(config.getInitialFocus ? {getInitialFocus: config.getInitialFocus} : {}),
			onEscape: () => close('escape')
		})
		layer.mount()
		store.setState({mounted: true})
		syncDom()
		if (store.getState().open) nextFrame(layer.open)
	}

	const destroy = () => {
		if (!mounted) return
		layer.destroy()
		focusTrap?.destroy()
		focusTrap = null
		mounted = false
		store.setState({mounted: false, open: false})
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
		updatePosition
	}
}
