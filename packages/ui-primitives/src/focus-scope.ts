const focusableSelector = [
	'a[href]',
	'area[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'iframe',
	'object',
	'embed',
	'[contenteditable="true"]',
	'[tabindex]:not([tabindex="-1"])'
].join(',')

const isElementVisible = (element: HTMLElement) => {
	if (!element.isConnected) return false
	if (element.hidden) return false

	const ownerWindow = element.ownerDocument?.defaultView
	const style = ownerWindow?.getComputedStyle(element)
	if (style?.display === 'none' || style?.visibility === 'hidden') return false

	const isJsdom = ownerWindow?.navigator.userAgent.toLowerCase().includes('jsdom') ?? false
	return element.getClientRects().length > 0 ||
		element.offsetWidth > 0 || element.offsetHeight > 0 || isJsdom
}

export const getFocusableElements = (container: HTMLElement | null | undefined): HTMLElement[] => {
	if (!container || typeof document === 'undefined') return []

	const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
	return elements.filter((element) => {
		if (element.matches(':disabled')) return false
		if (element.tabIndex < 0) return false
		if (element.getAttribute('aria-hidden') === 'true') return false
		if (element.closest('[aria-hidden="true"], [inert], [hidden]')) return false
		return isElementVisible(element)
	})
}

export const focusInitialTarget = (
	container: HTMLElement | null | undefined,
	preferred?: HTMLElement | null
) => {
	if (!container || typeof window === 'undefined') return

	const focusableElements = getFocusableElements(container)
	const target =
		preferred && !('disabled' in preferred && preferred.disabled) && focusableElements.includes(preferred)
			? preferred
			: focusableElements[0] ?? container

	// Callers schedule this after their portalled surface has mounted. Focusing
	// here avoids a second animation-frame delay, which can otherwise leave the
	// opener focused while a modal is already interactive.
	target.focus()
}

export const trapTabKey = (event: KeyboardEvent, container: HTMLElement | null | undefined) => {
	if (event.key !== 'Tab') return false
	if (!container || typeof document === 'undefined') return false

	const focusableElements = getFocusableElements(container)
	if (focusableElements.length === 0) {
		event.preventDefault()
		container.focus()
		return true
	}

	const firstElement = focusableElements[0]!
	const lastElement = focusableElements[focusableElements.length - 1]!
	const active = document.activeElement

	if (event.shiftKey && (!active || active === firstElement || !container.contains(active))) {
		event.preventDefault()
		lastElement.focus()
		return true
	}

	if (!event.shiftKey && (!active || active === lastElement || !container.contains(active))) {
		event.preventDefault()
		firstElement.focus()
		return true
	}

	return false
}

export const restoreFocus = (
	element: HTMLElement | null | undefined, fallbackScope?: HTMLElement | null
) => {
	if (!element || typeof window === 'undefined' || typeof document === 'undefined') return
	const restoreKey = element.getAttribute('data-focus-restore-key')
	window.requestAnimationFrame(() => {
		// Saving a drawer can refresh and replace its original table button.
		const target = document.contains(element) ? element :
			element.id ? document.getElementById(element.id) :
				restoreKey ? Array.from(document.querySelectorAll<HTMLElement>('[data-focus-restore-key]'))
					.find((candidate) => candidate.getAttribute('data-focus-restore-key') === restoreKey) : null
		if (target && target !== document.body && target !== document.documentElement && isElementVisible(target) && !target.closest('[inert], [aria-hidden="true"]') &&
      !target.matches(':disabled')) target.focus()
		else if (fallbackScope?.isConnected && (document.activeElement === document.body || document.activeElement?.closest('[inert], [aria-hidden="true"]'))) {
			getFocusableElements(fallbackScope)[0]?.focus()
		}
	})
}

type FocusTargetGetter = () => HTMLElement | null | undefined

export interface ModalFocusControllerOptions {
	getContainer: FocusTargetGetter;
	getRoot?: FocusTargetGetter;
	getInitialFocus?: FocusTargetGetter;
	getRestoreFocusTo?: FocusTargetGetter;
	shouldRestoreFocus?: () => boolean;
	onEscape?: (event: KeyboardEvent) => void;
}

export interface PopoverFocusControllerOptions {
	focusOnOpen?: boolean;
	getContainer: FocusTargetGetter;
	getInitialFocus?: FocusTargetGetter;
	getRestoreFocusTo?: FocusTargetGetter;
	shouldRestoreFocus?: () => boolean;
	onEscape?: (event: KeyboardEvent) => void;
}

interface InertRecord {
	inert: boolean;
	ariaHidden: string | null;
}

type ModalFocusController = ReturnType<typeof createModalFocusController>

const modalStack: ModalFocusController[] = []
const inertRecords = new Map<HTMLElement, InertRecord>()
const modalFocusPortals = new Map<HTMLElement, HTMLElement>()

const isConnectedElement = (element: HTMLElement | null | undefined): element is HTMLElement =>
	Boolean(element?.isConnected)

const portalBelongsTo = (portal: HTMLElement, root: HTMLElement | null | undefined) => {
	if (!root) return false
	let owner = modalFocusPortals.get(portal)
	const seen = new Set<HTMLElement>()
	while (owner?.isConnected && !root.contains(owner) && !seen.has(owner)) {
		seen.add(owner)
		owner = Array.from(modalFocusPortals.entries())
			.find(([candidate]) => candidate.contains(owner!))?.[1]
	}
	return Boolean(owner?.isConnected && root.contains(owner))
}

const isInAllowedExternalFocusRoot = (
	target: EventTarget | null, root: HTMLElement | null | undefined
) => target instanceof HTMLElement && !root?.contains(target) && (
	Array.from(modalFocusPortals.keys()).some((portal) =>
		portal.contains(target) && portalBelongsTo(portal, root)) ||
	Boolean(target.closest('[data-modal-focus-allow]'))
)

const getTopModal = () => {
	for (let index = modalStack.length - 1; index >= 0; index -= 1) {
		const controller = modalStack[index]!
		const root = controller.getRootElement()
		const container = controller.getContainerElement()
		if (isConnectedElement(root) && isConnectedElement(container)) return controller
	}
	return null
}

const restoreInertElement = (element: HTMLElement, record: InertRecord) => {
	element.inert = record.inert
	if (record.ariaHidden === null) {
		element.removeAttribute('aria-hidden')
	} else {
		element.setAttribute('aria-hidden', record.ariaHidden)
	}
}

const applyManagedInert = (element: HTMLElement) => {
	if (!inertRecords.has(element)) {
		inertRecords.set(element, {
			inert: element.inert,
			ariaHidden: element.getAttribute('aria-hidden')
		})
	}
	element.inert = true
	element.setAttribute('aria-hidden', 'true')
}

const reconcileModalIsolation = () => {
	if (typeof document === 'undefined') return

	const top = getTopModal()
	const activeRoot = top?.getRootElement() ?? null

	for (const [element, record] of Array.from(inertRecords.entries())) {
		if (element === activeRoot) {
			// A newly opened drawer may have been isolated while it was still closed.
			// Its active controller supersedes that old hidden baseline.
			element.inert = false
			element.removeAttribute('inert')
			element.setAttribute('aria-hidden', 'false')
		} else {
			restoreInertElement(element, record)
		}
		inertRecords.delete(element)
	}

	if (!activeRoot) return

	let branch: HTMLElement | null = activeRoot
	let parent = branch.parentElement

	while (parent) {
		for (const child of Array.from(parent.children)) {
			if (!(child instanceof HTMLElement)) continue
			if (child === branch || child.contains(activeRoot)) continue
			let portalOwner = modalFocusPortals.get(child)
			const seenOwners = new Set<HTMLElement>()
			while (portalOwner?.isConnected &&
				!activeRoot.contains(portalOwner) && !seenOwners.has(portalOwner)) {
				seenOwners.add(portalOwner)
				portalOwner = Array.from(modalFocusPortals.entries())
					.find(([portal]) => portal.contains(portalOwner!))?.[1]
			}
			if (portalOwner?.isConnected && activeRoot.contains(portalOwner)) continue
			applyManagedInert(child)
		}
		if (parent === document.body) break
		branch = parent
		parent = parent.parentElement
	}
}

/** Keep a portalled control interactive only while its owning modal is active. */
export const registerModalFocusPortal = (portal: HTMLElement, owner: HTMLElement) => {
	modalFocusPortals.set(portal, owner)
	reconcileModalIsolation()
	return () => {
		modalFocusPortals.delete(portal)
		reconcileModalIsolation()
	}
}

const removeModalFromStack = (controller: ModalFocusController) => {
	const index = modalStack.indexOf(controller)
	if (index >= 0) modalStack.splice(index, 1)
	reconcileModalIsolation()
}

export const createModalFocusController = (options: ModalFocusControllerOptions) => {
	let active = false
	let restoreTarget: HTMLElement | null = null
	let restoreScope: HTMLElement | null = null
	let restoreMainScope: HTMLElement | null = null
	let restoreUrl: string | null = null

	const controller = {
		getContainerElement: () => options.getContainer() ?? null,
		getRootElement: () => options.getRoot?.() ?? options.getContainer() ?? null,
		isActive: () => active,
		isTop: () => getTopModal() === controller,
		setOpen(nextOpen: boolean) {
			if (typeof window === 'undefined' || typeof document === 'undefined') return

			const container = options.getContainer()
			const root = options.getRoot?.() ?? container
			const canActivate = nextOpen && isConnectedElement(container) && isConnectedElement(root)

			if (canActivate && !active) {
				restoreTarget = options.getRestoreFocusTo?.() ??
					(document.activeElement as HTMLElement | null)
				restoreScope = restoreTarget?.closest<HTMLElement>('[role="region"], [role="dialog"], main') ?? null
				restoreMainScope = document.querySelector<HTMLElement>('main')
				restoreUrl = window.location.origin + window.location.pathname
				active = true
				if (!modalStack.includes(controller)) modalStack.push(controller)
				reconcileModalIsolation()
				window.requestAnimationFrame(() => {
					if (!active || !controller.isTop()) return
					const current = document.activeElement
					const liveContainer = options.getContainer()
					const liveRoot = options.getRoot?.() ?? liveContainer
					// Preserve focus chosen in the active modal or an allowed popup,
					// but move it out of a parent drawer made inert by this modal.
					const focusIsUsable = current instanceof Element && !current.closest('[inert], [aria-hidden="true"]')
					if (focusIsUsable && (liveContainer?.contains(current) || liveRoot?.contains(current) ||
						isInAllowedExternalFocusRoot(current, liveRoot))) return
					focusInitialTarget(liveContainer, options.getInitialFocus?.() ?? null)
				})
				return
			}

			if (!nextOpen && active) {
				active = false
				removeModalFromStack(controller)
				const target = options.getRestoreFocusTo?.() ?? restoreTarget
				restoreTarget = null
				if (options.shouldRestoreFocus?.() !== false) {
					restoreFocus(target, restoreUrl === window.location.origin + window.location.pathname
						? (restoreScope?.isConnected ? restoreScope : restoreMainScope) : null)
				}
			}
		},
		handleKeydown(event: KeyboardEvent) {
			if (!active || !controller.isTop() || event.defaultPrevented || event.isComposing) return
			if (isInAllowedExternalFocusRoot(event.target, controller.getRootElement())) return
			if (event.key === 'Tab') {
				trapTabKey(event, options.getContainer())
				return
			}
			if (event.key !== 'Escape') return
			event.preventDefault()
			options.onEscape?.(event)
		},
		handleFocusin(event: FocusEvent) {
			if (!active || !controller.isTop() || typeof window === 'undefined') return
			const container = options.getContainer()
			const root = options.getRoot?.() ?? container
			const target = event.target
			if (isInAllowedExternalFocusRoot(target, root)) return
			if (!container || !(target instanceof Node) ||
				container.contains(target) || root?.contains(target)) return
			window.requestAnimationFrame(() => {
				if (!active || !controller.isTop()) return
				const current = document.activeElement
				const liveContainer = options.getContainer()
				const liveRoot = options.getRoot?.() ?? liveContainer
				// Enhanced saves can reset focus to body and restore it before this frame.
				// Keep that restored control, including a nested portalled popup.
				if (liveContainer?.contains(current) || liveRoot?.contains(current) ||
					isInAllowedExternalFocusRoot(current, liveRoot)) return
				focusInitialTarget(liveContainer, options.getInitialFocus?.() ?? null)
			})
		},
		destroy() {
			if (!active) return
			active = false
			removeModalFromStack(controller)
			const target = options.getRestoreFocusTo?.() ?? restoreTarget
			restoreTarget = null
			if (options.shouldRestoreFocus?.() !== false) {
				restoreFocus(target, restoreUrl === window.location.origin + window.location.pathname
					? (restoreScope?.isConnected ? restoreScope : restoreMainScope) : null)
			}
		}
	}

	return controller
}

export const createPopoverFocusController = (options: PopoverFocusControllerOptions) => {
	let active = false
	let restoreTarget: HTMLElement | null = null
	let restoreScope: HTMLElement | null = null
	let restoreMainScope: HTMLElement | null = null
	let restoreUrl: string | null = null

	return {
		isActive: () => active,
		setOpen(nextOpen: boolean) {
			if (typeof window === 'undefined' || typeof document === 'undefined') return
			const container = options.getContainer()
			const canActivate = nextOpen && isConnectedElement(container)

			if (canActivate && !active) {
				restoreTarget = options.getRestoreFocusTo?.() ??
					(document.activeElement as HTMLElement | null)
				restoreScope = restoreTarget?.closest<HTMLElement>('[role="region"], [role="dialog"], main') ?? null
				restoreMainScope = document.querySelector<HTMLElement>('main')
				restoreUrl = window.location.origin + window.location.pathname
				active = true
				if (options.focusOnOpen !== false) window.requestAnimationFrame(() => {
					if (!active) return
					focusInitialTarget(options.getContainer(), options.getInitialFocus?.() ?? null)
				})
				return
			}

			if (!nextOpen && active) {
				active = false
				const target = options.getRestoreFocusTo?.() ?? restoreTarget
				restoreTarget = null
				if (options.shouldRestoreFocus?.() !== false) {
					restoreFocus(target, restoreUrl === window.location.origin + window.location.pathname
						? (restoreScope?.isConnected ? restoreScope : restoreMainScope) : null)
				}
			}
		},
		handleKeydown(event: KeyboardEvent) {
			if (!active || event.key !== 'Escape') return
			event.preventDefault()
			options.onEscape?.(event)
		},
		destroy() {
			if (!active) return
			active = false
			const target = options.getRestoreFocusTo?.() ?? restoreTarget
			restoreTarget = null
			if (options.shouldRestoreFocus?.() !== false) {
				restoreFocus(target, restoreUrl === window.location.origin + window.location.pathname
					? (restoreScope?.isConnected ? restoreScope : restoreMainScope) : null)
			}
		}
	}
}

/** A non-modal drawer never traps focus or isolates the rest of the document. */
export const createNonModalFocusController = (options: PopoverFocusControllerOptions) =>
	createPopoverFocusController({
		...options,
		focusOnOpen: options.focusOnOpen ?? false,
		shouldRestoreFocus: options.shouldRestoreFocus ?? (() => options.focusOnOpen === true)
	})

/** Internal focus-trap boundary checks shared by modal and floating consumers. */
export const isFocusWithinScope = (
	target: EventTarget | null, root: HTMLElement | null | undefined
) =>
	target instanceof Node && Boolean(root?.contains(target) ||
		Array.from(modalFocusPortals.keys()).some((portal) =>
			portal.contains(target) && portalBelongsTo(portal, root)))

export const isFocusScopeAllowed = (container: HTMLElement | null | undefined) => {
	const top = getTopModal()
	if (!top) return true
	const root = top.getRootElement()
	return Boolean(container && (root?.contains(container) || portalBelongsTo(container, root)))
}
