import {createFocusTrap, shouldReduceMotion, type FocusTrap} from '@ooopsstudio/accessibility'

import {dispatchUiEvent, isBrowser} from './dom'
import {UI_EVENTS} from './events'
import {hasLayerEscape} from './layer'
import {createControllerStore, type Subscriber} from './store'

export type DialogCloseReason = 'cancel' | 'confirm' | 'close' | 'escape' | 'backdrop' | string

export type DialogState = {
	open: boolean
	busy: boolean
	mounted: boolean
	closeReason: DialogCloseReason | null
}

export type DialogControllerOptions = {
	open?: boolean
	busy?: boolean
	closeOnEscape?: boolean
	closeOnBackdrop?: boolean
	modal?: boolean
	getRoot: () => HTMLElement | null | undefined
	getDialog: () => HTMLElement | null | undefined
	getInitialFocus?: () => HTMLElement | null | undefined
	getRestoreFocusTo?: () => HTMLElement | null | undefined
	onOpenChange?: (open: boolean) => void
	beforeClose?: (reason: DialogCloseReason) => boolean | void
	onConfirmError?: (error: unknown) => void
	onClose?: (reason: DialogCloseReason) => void
	onConfirm?: () => void | Promise<void>
	eventNames?: {
		close?: string
		confirm?: string
	}
}

export type DialogController = {
	getState: () => DialogState
	subscribe: (subscriber: Subscriber<DialogState>) => () => void
	mount: () => void
	destroy: () => void
	open: () => void
	close: (reason?: DialogCloseReason) => void
	toggle: () => void
	confirm: () => Promise<void>
	setBusy: (busy: boolean) => void
}

export const createDialogController = (config: DialogControllerOptions): DialogController => {
	let mounted = false
	let focusTrap: FocusTrap | null = null
	let approvedClose = false
	let confirming = false
	let externalBusy = config.busy ?? false
	const store = createControllerStore<DialogState>({
		open: config.open ?? false,
		busy: config.busy ?? false,
		mounted: false,
		closeReason: null
	})

	const syncDom = () => {
		const state = store.getState()
		const root = config.getRoot()
		root?.setAttribute('data-state', state.open ? 'open' : 'closed')
		root?.setAttribute('data-busy', String(state.busy))
	}

	const finalizeClose = (reason: DialogCloseReason) => {
		store.setState({open: false, closeReason: reason})
		focusTrap?.deactivate()
		syncDom()
		config.onOpenChange?.(false)
		config.onClose?.(reason)
		dispatchUiEvent(config.getRoot(), config.eventNames?.close ?? UI_EVENTS.dialogClose, {reason})
	}

	const open = () => {
		if (!isBrowser() || store.getState().open) return
		const dialog = config.getDialog()
		if (!dialog) return
		store.setState({open: true, closeReason: null})
		if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal()
		else {
			dialog.hidden = false
			dialog.setAttribute('aria-modal', 'true')
		}
		focusTrap?.activate()
		syncDom()
		config.onOpenChange?.(true)
	}

	const close = (reason: DialogCloseReason = 'close') => {
		if (!store.getState().open) return
		if (store.getState().busy || config.beforeClose?.(reason) === false) {
			config.onOpenChange?.(true)
			return
		}
		const dialog = config.getDialog()
		if (dialog instanceof HTMLDialogElement && dialog.open) {
			approvedClose = true
			dialog.close(reason)
			return
		}
		if (dialog) dialog.hidden = true
		finalizeClose(reason)
	}

	const confirm = async() => {
		if (!store.getState().open || store.getState().busy || confirming) return
		confirming = true
		store.setState({busy: true})
		syncDom()
		try {
			await config.onConfirm?.()
		} catch(error) {
			config.onConfirmError?.(error)
			dispatchUiEvent(config.getRoot(), 'ooops:dialog-error', {error})
			return
		} finally {
			confirming = false
			store.setState({busy: externalBusy})
			syncDom()
		}
		if (!mounted) return
		dispatchUiEvent(config.getRoot(), config.eventNames?.confirm ?? UI_EVENTS.dialogConfirm, {})
		close('confirm')
	}

	const handleCancel = (event: Event) => {
		event.preventDefault()
		if (config.closeOnEscape !== false) close('escape')
	}

	const handleNativeClose = (event: Event) => {
		const dialog = event.currentTarget as HTMLDialogElement
		const reason = dialog.returnValue || 'close'
		if (!approvedClose &&
			(store.getState().busy ||
			config.beforeClose?.(reason) === false)) { dialog.showModal(); return }
		approvedClose = false
		finalizeClose(reason)
	}

	const handleBackdrop = (event: PointerEvent) => {
		if (config.closeOnBackdrop === false || store.getState().busy) return
		if (event.target === config.getDialog()) close('backdrop')
	}

	const mount = () => {
		if (mounted || !isBrowser()) return
		const dialog = config.getDialog()
		if (!dialog) return
		mounted = true
		focusTrap = createFocusTrap({
			modal: config.modal !== false,
			getContainer: config.getDialog,
			getRoot: config.getRoot,
			...(config.getInitialFocus ? {getInitialFocus: config.getInitialFocus} : {}),
			...(config.getRestoreFocusTo ? {getRestoreFocusTo: config.getRestoreFocusTo} : {}),
			onEscape: (event) => {
				if (hasLayerEscape(event, config.getDialog())) return
				if (config.closeOnEscape !== false) close('escape')
			}
		})
		dialog.addEventListener('pointerdown', handleBackdrop)
		if (dialog instanceof HTMLDialogElement) {
			dialog.addEventListener('cancel', handleCancel)
			dialog.addEventListener('close', handleNativeClose)
		}
		store.setState({mounted: true})
		syncDom()
		if (store.getState().open) {
			store.setState({open: false})
			open()
		}
	}

	const destroy = () => {
		if (!mounted) return
		const dialog = config.getDialog()
		dialog?.removeEventListener('pointerdown', handleBackdrop)
		if (dialog instanceof HTMLDialogElement) {
			dialog.removeEventListener('cancel', handleCancel)
			dialog.removeEventListener('close', handleNativeClose)
		}
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
		confirm,
		setBusy(busy) {
			externalBusy = busy
			store.setState({busy: busy || confirming})
			syncDom()
		}
	}
}

export const dialogTransitionDuration = (durationMs: number) =>
	shouldReduceMotion() ? 0 : durationMs
