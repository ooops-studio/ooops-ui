<script lang="ts">
	import {getUiPart, createDialogController, resolveUiMessages, type DialogCloseReason, type DialogState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined;
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
		onConfirm?: () => boolean | void | Promise<boolean | void>
		onClose?: (reason: DialogCloseReason) => void
	}

	const generatedId = $props.id()
	let {
		initialFocus, restoreFocusTo, beforeClose, onConfirmError, id = generatedId, open = $bindable(false), title, description,
		confirmLabel, cancelLabel, tone = 'primary', busy = false,
		closeOnBackdrop = true, closeOnEscape = true, messages, parts, class: className = '', trigger, children,
		onConfirm, onClose
	}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null)
	let dialog: HTMLDialogElement | null = $state(null)
	let triggerButton: HTMLButtonElement | null = $state(null)
	let cancelButton: HTMLButtonElement | null = $state(null)
	let controller: ReturnType<typeof createDialogController> | null = null
	let viewState: DialogState = $state({open: false, busy: false, mounted: false, closeReason: null})

	onMount(() => {
		controller = createDialogController({
			open, busy: false,
			get closeOnBackdrop() { return closeOnBackdrop },
			get closeOnEscape() { return closeOnEscape },
			getRoot: () => root, getDialog: () => dialog, getInitialFocus: () => initialFocus?.() ?? cancelButton,
			getRestoreFocusTo: () => restoreFocusTo?.() ?? triggerButton, beforeClose: reason => beforeClose?.(reason), onConfirmError: error => onConfirmError?.(error),
			onOpenChange: (next) => { open = next },
			onConfirm: () => onConfirm?.(), onClose: reason => onClose?.(reason)
		})
		const unsubscribe = controller.subscribe((next) => { viewState = next })
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

{#if trigger}<button bind:this={triggerButton} type="button" onclick={() => controller?.open()} aria-haspopup="dialog" data-ooops-ui {...getUiPart(parts, 'trigger')} data-part="trigger">{@render trigger()}</button>{/if}
<span bind:this={root}  data-ooops-ui {...getUiPart(parts, 'root', `ooops-dialog-root ${className}`.trim(), undefined)} data-part="root">
	<dialog bind:this={dialog} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} data-ooops-ui {...getUiPart(parts, 'dialog')} data-part="dialog" data-tone={tone}>
		<div data-ooops-ui {...getUiPart(parts, 'surface')} data-part="surface">
			<header data-ooops-ui {...getUiPart(parts, 'header')} data-part="header"><h2 id={`${id}-title`} {...getUiPart(parts, 'title')} data-ooops-ui data-part="title">{title}</h2>{#if description}<p id={`${id}-description`} {...getUiPart(parts, 'description')} data-ooops-ui data-part="description">{description}</p>{/if}</header>
			{#if children}<div data-ooops-ui {...getUiPart(parts, 'body')} data-part="body">{@render children()}</div>{/if}
			<footer data-ooops-ui {...getUiPart(parts, 'footer')} data-part="footer">
				<button bind:this={cancelButton} type="button" onclick={() => controller?.close('cancel')} disabled={viewState.busy} data-ooops-ui {...getUiPart(parts, 'cancel')} data-part="cancel">{cancelLabel ?? uiMessages.cancel}</button>
				<button type="button" onclick={() => void controller?.confirm()} disabled={viewState.busy} data-ooops-ui {...getUiPart(parts, 'confirm')} data-part="confirm">{confirmLabel ?? uiMessages.confirm}</button>
			</footer>
		</div>
	</dialog>
</span>
