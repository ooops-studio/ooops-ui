import {
	UI_EVENTS,
	connectOverlayTrigger,
	createDialogController,
	createPopoverController,
	createSelectController,
	type DialogController,
	type PopoverController,
	type SelectController,
	type SelectOption
} from '@ooopsstudio/ui-primitives'

import {destroyMountedUi} from './runtime/shared'

type MountedController = {
	destroy: () => void
	portals: HTMLElement[]
}

type SelectConfig = {
	id: string
	value: string
	defaultValue: string
	disabled: boolean
	allowEmpty: boolean
	portal: boolean
	options: SelectOption[]
}

const mounted = new Map<HTMLElement, MountedController>()
let lifecycleInstalled = false

const escapeSelector = (value: string) =>
	globalThis.CSS?.escape?.(value) ?? value.replaceAll('"', '\\"')

export const serializeUiConfig = (value: unknown) =>
	JSON.stringify(value)
		.replaceAll('<', '\\u003c')
		.replaceAll('>', '\\u003e')
		.replaceAll('&', '\\u0026')
		.replaceAll('\u2028', '\\u2028')
		.replaceAll('\u2029', '\\u2029')

const readConfig = <Config>(root: HTMLElement): Config => {
	const script = root.querySelector<HTMLScriptElement>(':scope > [data-ooops-ui-config]')
	if (!script?.textContent) throw new Error('Missing UI component configuration.')
	return JSON.parse(script.textContent) as Config
}

const ownPortal = (element: HTMLElement, enabled: boolean, portals: HTMLElement[]) => {
	if (!enabled || element.parentElement === document.body) return
	element.dataset.ooopsPortalOwned = 'true'
	document.body.appendChild(element)
	portals.push(element)
}

const renderCurrentOption = (
	root: HTMLElement,
	option: SelectOption | null,
	placeholder: string
) => {
	const current = root.querySelector<HTMLElement>('[data-part="value"]')
	if (!current) return
	current.replaceChildren()
	if (!option) {
		current.textContent = placeholder
		return
	}
	if (option.icon) {
		const icon = document.createElement('span')
		icon.dataset.part = 'value-icon'
		icon.ariaHidden = 'true'
		icon.textContent = option.icon
		current.appendChild(icon)
	}
	if (option.iconUrl) {
		const image = document.createElement('img')
		image.dataset.part = 'value-image'
		image.src = option.iconUrl
		image.alt = ''
		current.appendChild(image)
	}
	current.append(option.label)
}

const mountSelect = (root: HTMLElement) => {
	const config = readConfig<SelectConfig>(root)
	const trigger = root.querySelector<HTMLElement>('[data-part="trigger"]')
	const nativeSelect = root.querySelector<HTMLSelectElement>('[data-part="native-select"]')
	const listbox = document.querySelector<HTMLElement>(
		`[data-ooops-select-listbox="${escapeSelector(config.id)}"]`
	)
	if (!trigger || !nativeSelect || !listbox) return
	const portals: HTMLElement[] = []
	ownPortal(listbox, config.portal, portals)
	const placeholder = root.dataset.placeholder ?? 'Select an option'
	const controller: SelectController = createSelectController({
		options: config.options,
		value: config.value,
		defaultValue: config.defaultValue,
		disabled: config.disabled,
		allowEmpty: config.allowEmpty,
		getRoot: () => root,
		getTrigger: () => trigger,
		getListbox: () => listbox,
		getNativeSelect: () => nativeSelect,
		onChange: ({option}) => renderCurrentOption(root, option, placeholder)
	})
	controller.mount()
	mounted.set(root, {destroy: () => controller.destroy(), portals})
}

type DialogConfig = {
	initialFocusId?: string
	restoreFocusId?: string
	id: string
	open: boolean
	busy?: boolean
	closeOnBackdrop: boolean
	closeOnEscape: boolean
	type: 'dialog' | 'modal'
}

/** Synchronously register async work during ooops:dialog-confirm-request. */
export type DialogConfirmRequestDetail = {waitUntil: (promise: PromiseLike<unknown>) => void}

const mountDialog = (root: HTMLElement) => {
	const config = readConfig<DialogConfig>(root)
	const dialog = root.querySelector<HTMLDialogElement>(':scope > [data-part="dialog"]')
	if (!dialog) return
	const initialFocus = Array.from(root.querySelectorAll<HTMLElement>('[data-initial-focus]')).find(
		(element) =>
			element.closest('[data-ooops-dialog-root], [data-ooops-modal-root]') === root
	)
	const triggers = Array.from(
		document.querySelectorAll<HTMLElement>(
			`[data-ooops-${config.type}-open="${escapeSelector(config.id)}"]`
		)
	)
	const controller: DialogController = createDialogController({
		open: config.open,
		...(config.busy === undefined ? {} : {busy: config.busy}),
		closeOnBackdrop: config.closeOnBackdrop,
		closeOnEscape: config.closeOnEscape,
		onConfirm: async() => {
			const work: Promise<unknown>[] = []
			const event = new CustomEvent<DialogConfirmRequestDetail>('ooops:dialog-confirm-request', {
				bubbles: true, cancelable: true,
				detail: {waitUntil: (promise) => { work.push(Promise.resolve(promise)) }}
			})
			const accepted = root.dispatchEvent(event)
			await Promise.all(work)
			return accepted
		},
		getRoot: () => root,
		getDialog: () => dialog,
		getInitialFocus: () => config.initialFocusId
			? document.getElementById(config.initialFocusId)
			: initialFocus,
		getRestoreFocusTo: () => config.restoreFocusId
			? document.getElementById(config.restoreFocusId)
			: triggers[0],
		beforeClose: (reason) => root.dispatchEvent(new CustomEvent('ooops:before-close', {bubbles: true, cancelable: true, detail: {reason}})),
		...(config.type === 'modal' ? {eventNames: {close: UI_EVENTS.modalClose}} : {})
	})
	const cleanup: Array<() => void> = []
	const listen = (element: HTMLElement | undefined, action: () => void) => {
		if (!element) return
		element.addEventListener('click', action)
		cleanup.push(() => element.removeEventListener('click', action))
	}
	for (const trigger of triggers) listen(trigger, controller.open)
	const cancel = Array.from(root.querySelectorAll<HTMLElement>('[data-dialog-cancel]'))
		.find((element) => element.closest('[data-ooops-dialog-root]') === root)
	listen(cancel, () => controller.close('cancel'))
	const confirm = Array.from(root.querySelectorAll<HTMLElement>('[data-dialog-confirm]'))
		.find((element) => element.closest('[data-ooops-dialog-root]') === root)
	listen(confirm, () => void controller.confirm())
	const dismiss = Array.from(root.querySelectorAll<HTMLElement>('[data-modal-close]'))
		.find((element) => element.closest('[data-ooops-modal-root]') === root)
	listen(dismiss, () => controller.close('close'))
	const unsubscribe = controller.subscribe((state) => {
		for (const action of [cancel, confirm, dismiss]) action?.toggleAttribute('disabled', state.busy)
	})
	controller.mount()
	mounted.set(root, {
		destroy: () => { unsubscribe(); for (const remove of cleanup) remove(); controller.destroy() },
		portals: []
	})
}

type PopoverConfig = {
	anchorId?: string
	portalTargetId?: string
	offset?: number
	zIndex?: number
	matchAnchorWidth?: boolean
	id: string
	open: boolean
	portal: boolean
	placement: 'top' | 'bottom' | 'left' | 'right'
	align: 'start' | 'center' | 'end'
	closeOnOutside: boolean
	closeOnOutsideFocus: boolean
	closeOnEscape: boolean
	focusOnOpen: boolean
	trapFocus: boolean
}

const mountPopover = (root: HTMLElement) => {
	const config = readConfig<PopoverConfig>(root)
	const anchor = config.anchorId
		? document.getElementById(config.anchorId)
		: root.querySelector<HTMLElement>('[data-part="trigger"]')
	const panel = document.querySelector<HTMLElement>(
		`[data-ooops-popover-panel="${escapeSelector(config.id)}"]`
	)
	if (!anchor || !panel) return
	const portals: HTMLElement[] = config.portal ? [panel] : []
	const controller: PopoverController = createPopoverController({
		open: config.open,
		portal: config.portal,
		getPortalRoot: () => config.portalTargetId
			? document.getElementById(config.portalTargetId) : null,
		placement: config.placement,
		align: config.align,
		closeOnOutsidePointer: config.closeOnOutside,
		closeOnOutsideFocus: config.closeOnOutsideFocus,
		closeOnEscape: config.closeOnEscape,
		focusOnOpen: config.focusOnOpen,
		trapFocus: config.trapFocus,
		getRoot: () => root,
		offset: config.offset ?? 8,
		zIndex: config.zIndex ?? 1000,
		matchAnchorWidth: config.matchAnchorWidth ?? false,
		beforeClose: (reason) => root.dispatchEvent(new CustomEvent('ooops:before-close', {bubbles: true, cancelable: true, detail: {reason}})),
		getAnchor: () => anchor,
		getPanel: () => panel
	})
	const restoreTrigger = connectOverlayTrigger(anchor, `${config.id}-panel`, panel.getAttribute('role') ?? 'dialog')
	anchor.addEventListener('click', controller.toggle)
	const extraTriggers = document.querySelectorAll<HTMLElement>(
		`[data-ooops-popover-open="${escapeSelector(config.id)}"]`
	)
	for (const trigger of extraTriggers) {
		trigger.addEventListener('click', controller.toggle)
	}
	controller.mount()
	mounted.set(root, {destroy: () => { anchor.removeEventListener('click', controller.toggle); for (const trigger of extraTriggers) trigger.removeEventListener('click', controller.toggle); controller.destroy(); restoreTrigger() }, portals})
}

export const mountAstroUi = (scope: ParentNode = document) => {
	for (const root of scope.querySelectorAll<HTMLElement>('[data-ooops-select-root]')) {
		if (!mounted.has(root)) mountSelect(root)
	}
	for (const root of scope.querySelectorAll<HTMLElement>(
		'[data-ooops-dialog-root], [data-ooops-modal-root]'
	)) {
		if (!mounted.has(root)) mountDialog(root)
	}
	for (const root of scope.querySelectorAll<HTMLElement>('[data-ooops-popover-root]')) {
		if (!mounted.has(root)) mountPopover(root)
	}
}

export const destroyAstroUi = () => {
	destroyMountedUi()
	for (const [root, entry] of mounted) {
		entry.destroy()
		for (const portal of entry.portals) portal.remove()
		mounted.delete(root)
	}
}

export const installAstroUi = () => {
	if (typeof document === 'undefined') return
	mountAstroUi()
	if (lifecycleInstalled) return
	lifecycleInstalled = true
	document.addEventListener('astro:before-swap', destroyAstroUi)
	document.addEventListener('astro:page-load', () => mountAstroUi())
}
