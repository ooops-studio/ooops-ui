import {isNodeInside} from './dom'
import {registerModalFocusPortal} from './focus-scope'

export type LayerPlacement = 'top' | 'bottom' | 'left' | 'right'
export type LayerAlign = 'start' | 'center' | 'end'
export type LayerCloseReason = 'escape' | 'outside-pointer' | 'outside-focus' | 'close'

export type LayerPosition = {
	placement: LayerPlacement
	top: number
	left: number
	maxWidth: number
	maxHeight: number
	anchorWidth: number
}

export type LayerControllerOptions = {
	getAnchor: () => HTMLElement | null | undefined
	getLayer: () => HTMLElement | null | undefined
	getDocument?: () => Document | null | undefined
	getPortalRoot?: () => HTMLElement | null | undefined
	placement?: LayerPlacement
	align?: LayerAlign
	offset?: number
	viewportPadding?: number
	zIndex?: number
	matchAnchorWidth?: boolean
	portal?: boolean
	/** Keep host-owned geometry/styles while retaining shared dismissal. */
	positioning?: boolean
	restoreFocusOnEscape?: boolean
	manageVisibility?: boolean
	pointerEventName?: 'pointerdown' | 'mousedown' | 'click'
	capturePointer?: boolean
	captureEscape?: boolean
	closeOnEscape?: boolean
	closeOnOutsidePointer?: boolean
	closeOnOutsideFocus?: boolean
	isTargetInside?: (target: EventTarget | null) => boolean
	onPosition?: (position: LayerPosition) => void
	beforeClose?: (reason: LayerCloseReason, event?: Event) => boolean | void
	onClose?: (reason: LayerCloseReason) => void
}

export type LayerController = {
	mount: () => void
	open: () => void
	close: (reason?: LayerCloseReason) => void
	update: () => void
	destroy: () => void
	isOpen: () => boolean
}

type LayerStackEntry = {
	controller: LayerController
	layer: () => HTMLElement | null | undefined
	anchor: () => HTMLElement | null | undefined
	forceClose: (reason: LayerCloseReason) => void
	parent: LayerController | null
}
const stacks = new WeakMap<Document, LayerStackEntry[]>()
const handledLayerEscapes = new WeakSet<Event>()

/** A nested floating layer owns this Escape, regardless of capture-listener order. */
export function hasLayerEscape(event: Event, container: HTMLElement | null | undefined): boolean {
	if (handledLayerEscapes.has(event)) return true
	if (!container) return false
	const top = stacks.get(container.ownerDocument)?.at(-1)
	return Boolean(top && (
		container.contains(top.layer() ?? null) || container.contains(top.anchor() ?? null)
	))
}

const stackFor = (document: Document) => {
	const existing = stacks.get(document)
	if (existing) return existing
	const stack: LayerStackEntry[] = []
	stacks.set(document, stack)
	return stack
}

const opposite: Record<LayerPlacement, LayerPlacement> = {
	top: 'bottom',
	bottom: 'top',
	left: 'right',
	right: 'left'
}

const viewport = (document: Document) => {
	const view = document.defaultView
	const visual = view?.visualViewport
	return {
		left: visual?.offsetLeft ?? 0,
		top: visual?.offsetTop ?? 0,
		width: visual?.width ?? view?.innerWidth ?? document.documentElement.clientWidth,
		height: visual?.height ?? view?.innerHeight ?? document.documentElement.clientHeight
	}
}

const alignedStart = (
	anchor: DOMRect,
	layer: DOMRect,
	placement: LayerPlacement,
	align: LayerAlign,
	rtl: boolean
) => {
	if (placement === 'top' || placement === 'bottom') {
		if (align === 'center') return anchor.left + (anchor.width - layer.width) / 2
		const start = rtl ? anchor.right - layer.width : anchor.left
		const end = rtl ? anchor.left : anchor.right - layer.width
		return align === 'start' ? start : end
	}
	if (align === 'center') return anchor.top + (anchor.height - layer.height) / 2
	return align === 'start' ? anchor.top : anchor.bottom - layer.height
}

export const calculateLayerPosition = (
	anchor: DOMRect,
	layer: DOMRect,
	options: {
		placement: LayerPlacement
		align: LayerAlign
		offset: number
		padding: number
		rtl: boolean
		viewport: ReturnType<typeof viewport>
	}
): LayerPosition => {
	const {align, offset, padding, rtl} = options
	const frame = options.viewport
	const available: Record<LayerPlacement, number> = {
		top: anchor.top - frame.top - offset - padding,
		bottom: frame.top + frame.height - anchor.bottom - offset - padding,
		left: anchor.left - frame.left - offset - padding,
		right: frame.left + frame.width - anchor.right - offset - padding
	}
	let placement = options.placement
	const required = placement === 'top' || placement === 'bottom' ? layer.height : layer.width
	if (required > available[placement] && available[opposite[placement]] > available[placement])
		placement = opposite[placement]
	let top =
		placement === 'top'
			? anchor.top - layer.height - offset
			: placement === 'bottom'
				? anchor.bottom + offset
				: alignedStart(anchor, layer, placement, align, rtl)
	let left =
		placement === 'left'
			? anchor.left - layer.width - offset
			: placement === 'right'
				? anchor.right + offset
				: alignedStart(anchor, layer, placement, align, rtl)
	const maxWidth = Math.max(0, frame.width - padding * 2)
	const maxHeight = Math.max(0, frame.height - padding * 2)
	left = Math.max(
		frame.left + padding,
		Math.min(left, frame.left + frame.width - Math.min(layer.width, maxWidth) - padding)
	)
	top = Math.max(
		frame.top + padding,
		Math.min(top, frame.top + frame.height - Math.min(layer.height, maxHeight) - padding)
	)
	return {
		placement,
		top: Math.round(top),
		left: Math.round(left),
		maxWidth: Math.floor(maxWidth),
		maxHeight: Math.floor(maxHeight),
		anchorWidth: Math.round(anchor.width)
	}
}

export const createLayerController = (options: LayerControllerOptions): LayerController => {
	let mounted = false
	let opened = false
	let originalParent: ParentNode | null = null
	let originalNext: ChildNode | null = null
	let resizeObserver: ResizeObserver | null = null
	let releasePortal: (() => void) | null = null
	const document = () =>
		options.getDocument?.() ?? options.getAnchor()?.ownerDocument ?? globalThis.document
	const descendants = () => {
		const currentDocument = document()
		if (!currentDocument) return []
		const stack = stackFor(currentDocument)
		const index = stack.findIndex((entry) => entry.controller === controller)
		if (index < 0) return []
		const branch = new Set([controller])
		const owned: LayerStackEntry[] = []
		for (const entry of stack.slice(index + 1)) {
			if (!entry.parent || !branch.has(entry.parent)) continue
			owned.push(entry)
			branch.add(entry.controller)
		}
		return owned
	}
	const inside = (target: EventTarget | null) =>
		(options.isTargetInside?.(target) ??
			isNodeInside(target, [options.getAnchor(), options.getLayer()])) ||
		descendants().some((entry) => isNodeInside(target, [entry.layer()]))
	const isTopmost = () => {
		const currentDocument = document()
		if (!currentDocument) return false
		return stackFor(currentDocument).at(-1)?.controller === controller
	}
	const update = () => {
		if (!opened || options.positioning === false) return
		const anchor = options.getAnchor()
		const layer = options.getLayer()
		const currentDocument = document()
		if (!anchor || !layer || !currentDocument) return
		const position = calculateLayerPosition(
			anchor.getBoundingClientRect(),
			layer.getBoundingClientRect(),
			{
				placement: options.placement ?? 'bottom',
				align: options.align ?? 'start',
				offset: options.offset ?? 8,
				padding: options.viewportPadding ?? 12,
				rtl: getComputedStyle(anchor).direction === 'rtl',
				viewport: viewport(currentDocument)
			}
		)
		layer.style.position = 'fixed'
		layer.style.left = `${position.left}px`
		layer.style.top = `${position.top}px`
		layer.style.maxWidth = `${position.maxWidth}px`
		layer.style.maxHeight = `${position.maxHeight}px`
		layer.style.zIndex = String(options.zIndex ?? 1000)
		if (options.matchAnchorWidth) layer.style.minWidth = `${position.anchorWidth}px`
		layer.style.setProperty('--ooops-ui-anchor-width', `${position.anchorWidth}px`)
		layer.style.setProperty('--ooops-ui-layer-x', `${position.left}px`)
		layer.style.setProperty('--ooops-ui-layer-y', `${position.top}px`)
		layer.dataset.placement = position.placement
		options.onPosition?.(position)
	}
	const close = (reason: LayerCloseReason = 'close', force = false, event?: Event) => {
		if (!opened || (!force && options.beforeClose?.(reason, event) === false)) return
		for (const entry of descendants().reverse()) entry.forceClose(reason)
		opened = false
		const currentDocument = document()
		if (currentDocument) {
			const stack = stackFor(currentDocument)
			const index = stack.findIndex((entry) => entry.controller === controller)
			if (index >= 0) stack.splice(index, 1)
		}
		const layer = options.getLayer()
		if (layer) {
			resizeObserver?.unobserve(layer)
			if (options.manageVisibility !== false) {
				layer.hidden = true
				layer.dataset.state = 'closed'
			}
		}
		releasePortal?.()
		releasePortal = null
		options.onClose?.(reason)
	}
	const onPointer = (event: Event) => {
		if (opened && options.closeOnOutsidePointer !== false && !inside(event.target))
			close('outside-pointer', false, event)
	}
	const onFocus = (event: FocusEvent) => {
		if (opened && options.closeOnOutsideFocus && !inside(event.target))
			close('outside-focus', false, event)
	}
	const onKey = (event: KeyboardEvent) => {
		if (!opened || event.defaultPrevented || handledLayerEscapes.has(event) || !isTopmost() || options.closeOnEscape === false || event.key !== 'Escape') return
		handledLayerEscapes.add(event)
		event.preventDefault()
		close('escape', false, event)
		if (options.restoreFocusOnEscape !== false) options.getAnchor()?.focus()
	}
	const open = () => {
		if (opened) return
		const currentDocument = document()
		const layer = options.getLayer()
		if (!currentDocument || !layer) return
		opened = true
		const anchor = options.getAnchor()
		const portalRoot = options.getPortalRoot?.() ??
			anchor?.closest<HTMLElement>('dialog') ?? currentDocument.body
		if (options.portal !== false && layer.parentNode !== portalRoot) {
			originalParent = layer.parentNode
			originalNext = layer.nextSibling
			portalRoot.appendChild(layer)
		}
		resizeObserver?.observe(layer)
		if (anchor && !anchor.contains(layer)) releasePortal = registerModalFocusPortal(layer, anchor)
		const stack = stackFor(currentDocument)
		const parent = [...stack].reverse()
			.find((entry) => isNodeInside(anchor ?? null, [entry.layer()]))
		stack.push({
			controller, layer: options.getLayer, anchor: options.getAnchor,
			forceClose: (reason) => close(reason, true), parent: parent?.controller ?? null
		})
		if (options.manageVisibility !== false) {
			layer.hidden = false
			layer.dataset.state = 'open'
		}
		update()
	}
	const mount = () => {
		if (mounted) return
		const currentDocument = document()
		const view = currentDocument?.defaultView
		if (!currentDocument || !view) return
		mounted = true
		currentDocument.addEventListener(options.pointerEventName ?? 'pointerdown', onPointer, options.capturePointer !== false)
		currentDocument.addEventListener('focusin', onFocus, true)
		currentDocument.addEventListener('keydown', onKey, options.captureEscape !== false)
		view.addEventListener('resize', update)
		view.addEventListener('scroll', update, true)
		view.visualViewport?.addEventListener('resize', update)
		view.visualViewport?.addEventListener('scroll', update)
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(update)
			const anchor = options.getAnchor()
			const layer = options.getLayer()
			if (anchor) resizeObserver.observe(anchor)
			if (layer) resizeObserver.observe(layer)
		}
	}
	const destroy = () => {
		close('close', true)
		if (!mounted) return
		const currentDocument = document()
		const view = currentDocument?.defaultView
		currentDocument?.removeEventListener(options.pointerEventName ?? 'pointerdown', onPointer, options.capturePointer !== false)
		currentDocument?.removeEventListener('focusin', onFocus, true)
		currentDocument?.removeEventListener('keydown', onKey, options.captureEscape !== false)
		view?.removeEventListener('resize', update)
		view?.removeEventListener('scroll', update, true)
		view?.visualViewport?.removeEventListener('resize', update)
		view?.visualViewport?.removeEventListener('scroll', update)
		resizeObserver?.disconnect()
		const layer = options.getLayer()
		if (layer && originalParent) originalParent.insertBefore(layer, originalNext)
		mounted = false
	}
	const controller: LayerController = {mount, open, close, update, destroy, isOpen: () => opened}
	return controller
}
