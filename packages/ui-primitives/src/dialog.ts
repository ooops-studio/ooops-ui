import {shouldReduceMotion, type FocusTrap} from '@ooopsstudio/accessibility'

import {dispatchUiEvent, isBrowser} from './dom'
import {UI_EVENTS} from './events'
import {createFocusTrap} from './focus-trap'
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
	closeOnConfirm?: boolean
	closeOnBackdrop?: boolean
	modal?: boolean
	manageFocus?: boolean
	manageVisibility?: boolean
	getRoot: () => HTMLElement | null | undefined
	getDialog: () => HTMLElement | null | undefined
	getInitialFocus?: () => HTMLElement | null | undefined
	getRestoreFocusTo?: () => HTMLElement | null | undefined
	onOpenChange?: (open: boolean) => void
	beforeClose?: (reason: DialogCloseReason) => boolean | void
	onConfirmError?: (error: unknown) => void
	onActionError?: (error: unknown, reason: DialogCloseReason) => void
	onClose?: (reason: DialogCloseReason) => void
	onConfirm?: () => boolean | void | Promise<boolean | void>
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
	runAction: (action: DialogControllerOptions['onConfirm'], reason?: DialogCloseReason) => Promise<boolean>
	confirm: () => Promise<void>
	setBusy: (busy: boolean) => void
}

export const createDialogController = (config: DialogControllerOptions): DialogController => {
	let mounted = false
	let lifetime = 0
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
		if (config.manageVisibility !== false) root?.setAttribute('data-state', state.open ? 'open' : 'closed')
		root?.setAttribute('data-busy', String(state.busy))
		config.getDialog()?.setAttribute('aria-busy', String(state.busy))
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
		if (config.manageVisibility !== false) {
			if (dialog instanceof HTMLDialogElement && !dialog.open) {
				if (config.modal === false) dialog.show()
				else dialog.showModal()
			} else {
				dialog.hidden = false
				dialog.setAttribute('aria-modal', String(config.modal !== false))
			}
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
		if (config.manageVisibility !== false && dialog instanceof HTMLDialogElement && dialog.open) {
			approvedClose = true
			dialog.close(reason)
			return
		}
		if (dialog && config.manageVisibility !== false) dialog.hidden = true
		finalizeClose(reason)
	}

	const runAction: DialogController['runAction'] = async(action, reason = 'action') => {
		if (!mounted || !store.getState().open || store.getState().busy || confirming) return false
		const actionLifetime = lifetime
		confirming = true
		store.setState({busy: true})
		syncDom()
		let accepted: boolean | void
		try {
			accepted = await action?.()
		} catch(error) {
			if (!mounted || actionLifetime !== lifetime) return false
			if (config.onActionError) config.onActionError(error, reason)
			else config.onConfirmError?.(error)
			dispatchUiEvent(config.getRoot(), 'ooops:dialog-error', {error, reason})
			return false
		} finally {
			if (mounted && actionLifetime === lifetime) {
				confirming = false
				store.setState({busy: externalBusy})
				syncDom()
			}
		}
		return mounted && actionLifetime === lifetime && accepted !== false
	}

	const confirm = async() => {
		if (!await runAction(config.onConfirm, 'confirm')) return
		dispatchUiEvent(config.getRoot(), config.eventNames?.confirm ?? UI_EVENTS.dialogConfirm, {})
		if (config.closeOnConfirm !== false) close('confirm')
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
		lifetime++
		if (config.manageFocus !== false) focusTrap = createFocusTrap({
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
		if (config.manageVisibility !== false) dialog.addEventListener('pointerdown', handleBackdrop)
		if (config.manageVisibility !== false && dialog instanceof HTMLDialogElement) {
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
		lifetime++
		confirming = false
		store.setState({mounted: false, open: false, busy: externalBusy})
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
		runAction,
		setBusy(busy) {
			externalBusy = busy
			store.setState({busy: busy || confirming})
			syncDom()
		}
	}
}

export const dialogTransitionDuration = (durationMs: number) =>
	shouldReduceMotion() ? 0 : durationMs
