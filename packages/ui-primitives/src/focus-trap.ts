import type {FocusTrap, FocusTrapOptions} from '@ooopsstudio/accessibility'

import {
	createModalFocusController, createPopoverFocusController, focusInitialTarget,
	isFocusWithinScope, isFocusScopeAllowed, trapTabKey
} from './focus-scope'
import {hasLayerEscape} from './layer'

/** Modal and floating traps share scope ownership and registered portal boundaries. */
export const createFocusTrap = (options: FocusTrapOptions): FocusTrap => {
	const modalScope = options.modal === true ? createModalFocusController(options) : null
	const scope = modalScope ?? createPopoverFocusController({...options, focusOnOpen: false})
	let listeningDocument: Document | null = null
	const canHandle = () => scope.isActive() &&
		Boolean(modalScope || isFocusScopeAllowed(options.getContainer()))
	const onKeydown = (event: KeyboardEvent) => {
		if (!canHandle() || event.defaultPrevented || event.isComposing) return
		const target = event.target as Element | null
		if ((event.key === 'Escape' ||
			(event.key === 'Tab' && target?.closest('[role="menu"]'))) &&
			hasLayerEscape(event, options.getContainer())) return
		if (modalScope) modalScope.handleKeydown(event)
		else if (event.key === 'Tab' && options.containFocus !== false) {
			trapTabKey(event, options.getContainer())
		} else scope.handleKeydown(event)
	}
	const onFocusin = (event: FocusEvent) => {
		if (!canHandle()) return
		if (modalScope) modalScope.handleFocusin(event)
		else if (options.containFocus !== false &&
			!isFocusWithinScope(event.target, options.getContainer())) {
			focusInitialTarget(options.getContainer(), options.getInitialFocus?.())
		}
	}
	const setActive = (active: boolean) => {
		const wasActive = scope.isActive()
		scope.setOpen(active)
		if (!wasActive && scope.isActive()) {
			focusInitialTarget(options.getContainer(), options.getInitialFocus?.())
		}
		const nextDocument = scope.isActive() ? options.getContainer()?.ownerDocument ?? null : null
		if (listeningDocument === nextDocument) return
		listeningDocument?.removeEventListener('keydown', onKeydown, true)
		listeningDocument?.removeEventListener('focusin', onFocusin, true)
		listeningDocument = nextDocument
		listeningDocument?.addEventListener('keydown', onKeydown, true)
		listeningDocument?.addEventListener('focusin', onFocusin, true)
	}
	return {
		isActive: scope.isActive,
		activate: () => setActive(true),
		deactivate: () => setActive(false),
		setActive,
		destroy() {
			setActive(false)
			scope.destroy()
		}
	}
}
