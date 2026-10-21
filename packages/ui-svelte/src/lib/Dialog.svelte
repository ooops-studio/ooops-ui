<script lang="ts">
	import {createDialogController, resolveUiMessages, type DialogCloseReason, type DialogState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	type Props = {
		initialFocus?: () => HTMLElement | null | undefined
		restoreFocusTo?: () => HTMLElement | null | undefined
		beforeClose?: (reason: DialogCloseReason) => boolean | void
		onConfirmError?: (error: unknown) => void
		id?: string
		open?: boolean
		title: string
		description?: string
		confirmLabel?: string
		cancelLabel?: string
		tone?: 'primary' | 'danger'
		busy?: boolean
		closeOnBackdrop?: boolean
		closeOnEscape?: boolean
		messages?: Partial<UiMessages>
		class?: string
		trigger?: Snippet
		children?: Snippet
		onConfirm?: () => void | Promise<void>
		onClose?: (reason: DialogCloseReason) => void
	}

	const generatedId = $props.id()
	let {
		initialFocus, restoreFocusTo, beforeClose, onConfirmError, id = generatedId, open = $bindable(false), title, description,
		confirmLabel, cancelLabel, tone = 'primary', busy = false,
		closeOnBackdrop = true, closeOnEscape = true, messages, class: className = '', trigger, children,
		onConfirm, onClose
	}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null)
	let dialog: HTMLDialogElement | null = $state(null)
	let triggerButton: HTMLButtonElement | null = $state(null)
	let cancelButton: HTMLButtonElement | null = $state(null)
	let controller: ReturnType<typeof createDialogController> | null = null
	let state: DialogState = $state({open: false, busy: false, mounted: false, closeReason: null})

	onMount(() => {
		controller = createDialogController({
			open, busy: false, closeOnBackdrop, closeOnEscape,
			getRoot: () => root, getDialog: () => dialog, getInitialFocus: () => initialFocus?.() ?? cancelButton,
			getRestoreFocusTo: () => restoreFocusTo?.() ?? triggerButton, beforeClose: reason => beforeClose?.(reason), onConfirmError: error => onConfirmError?.(error),
			onOpenChange: (next) => { open = next }, onConfirm, onClose
		})
		const unsubscribe = controller.subscribe((next) => { state = next })
		controller.mount()
		return () => { unsubscribe(); controller?.destroy(); controller = null }
	})
	$effect(() => {
		if (!controller) return
		if (open && !controller.getState().open) controller.open()
		if (!open && controller.getState().open) controller.close('close')
	})
	$effect(() => controller?.setBusy(busy))
</script>

{#if trigger}<button bind:this={triggerButton} type="button" onclick={() => controller?.open()} aria-haspopup="dialog" data-ooops-ui data-part="trigger">{@render trigger()}</button>{/if}
<span bind:this={root} class={`ooops-dialog-root ${className}`.trim()} data-ooops-ui data-part="root">
	<dialog bind:this={dialog} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} data-ooops-ui data-part="dialog" data-tone={tone}>
		<div data-ooops-ui data-part="surface">
			<header data-ooops-ui data-part="header"><h2 id={`${id}-title`}>{title}</h2>{#if description}<p id={`${id}-description`}>{description}</p>{/if}</header>
			{#if children}<div data-ooops-ui data-part="body">{@render children()}</div>{/if}
			<footer data-ooops-ui data-part="footer">
				<button bind:this={cancelButton} type="button" onclick={() => controller?.close('cancel')} disabled={state.busy} data-ooops-ui data-part="cancel">{cancelLabel ?? uiMessages.cancel}</button>
				<button type="button" onclick={() => void controller?.confirm()} disabled={state.busy} data-ooops-ui data-part="confirm">{confirmLabel ?? uiMessages.confirm}</button>
			</footer>
		</div>
	</dialog>
</span>
