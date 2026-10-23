<script lang="ts">
	import {getUiPart, createDialogController, resolveUiMessages, type DialogCloseReason, type DialogState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined;
		initialFocus?: () => HTMLElement | null | undefined
		restoreFocusTo?: () => HTMLElement | null | undefined
		beforeClose?: (reason: DialogCloseReason) => boolean | void
		onConfirmError?: (error: unknown) => void
		id?: string
		busy?: boolean
		open?: boolean
		title?: string
		description?: string
		ariaLabel?: string
		size?: 'sm' | 'md' | 'lg' | 'xl'
		closeLabel?: string
		closeOnBackdrop?: boolean
		closeOnEscape?: boolean
		showCloseButton?: boolean
		messages?: Partial<UiMessages>
		class?: string
		trigger?: Snippet
		children?: Snippet
		footer?: Snippet
		onClose?: (reason: DialogCloseReason) => void
	}

	const generatedId = $props.id()
	let {
		initialFocus, restoreFocusTo, beforeClose, onConfirmError, busy = false, id = generatedId, open = $bindable(false), title, description, ariaLabel, size = 'md',
		closeLabel, closeOnBackdrop = true, closeOnEscape = true,
		showCloseButton = true, messages, parts, class: className = '', trigger, children, footer, onClose
	}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null)
	let dialog: HTMLDialogElement | null = $state(null)
	let triggerButton: HTMLButtonElement | null = $state(null)
	let closeButton: HTMLButtonElement | null = $state(null)
	let controller: ReturnType<typeof createDialogController> | null = null
	let viewState: DialogState = $state({open, busy: false, mounted: false, closeReason: null})

	onMount(() => {
		controller = createDialogController({
			open,
			get closeOnBackdrop() { return closeOnBackdrop },
			get closeOnEscape() { return closeOnEscape },
			getRoot: () => root, getDialog: () => dialog,
			getInitialFocus: () => initialFocus?.() ?? closeButton, getRestoreFocusTo: () => restoreFocusTo?.() ?? triggerButton, beforeClose: reason => beforeClose?.(reason), onConfirmError: error => onConfirmError?.(error),
			onOpenChange: (next) => { open = next }, onClose: reason => onClose?.(reason),
			eventNames: {close: 'ooops:modal-close'}
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
<span bind:this={root}  data-ooops-ui {...getUiPart(parts, 'root', `ooops-modal-root ${className}`.trim(), undefined)} data-part="root" data-size={size}>
	<dialog bind:this={dialog} aria-label={title ? undefined : ariaLabel ?? uiMessages.dialog} aria-labelledby={title ? `${id}-title` : undefined} aria-describedby={description ? `${id}-description` : undefined} data-ooops-ui {...getUiPart(parts, 'dialog')} data-part="dialog">
		<article data-ooops-ui {...getUiPart(parts, 'surface')} data-part="surface">
			{#if showCloseButton}<button bind:this={closeButton} type="button" onclick={() => controller?.close('close')} disabled={viewState.busy} aria-label={closeLabel ?? uiMessages.closeDialog} data-ooops-ui {...getUiPart(parts, 'close')} data-part="close">×</button>{/if}
			{#if title || description}<header data-ooops-ui {...getUiPart(parts, 'header')} data-part="header">{#if title}<h2 id={`${id}-title`} {...getUiPart(parts, 'title')} data-ooops-ui data-part="title">{title}</h2>{/if}{#if description}<p id={`${id}-description`} {...getUiPart(parts, 'description')} data-ooops-ui data-part="description">{description}</p>{/if}</header>{/if}
			{#if children}<div data-ooops-ui {...getUiPart(parts, 'body')} data-part="body">{@render children()}</div>{/if}
			{#if footer}<footer data-ooops-ui {...getUiPart(parts, 'footer')} data-part="footer">{@render footer()}</footer>{/if}
		</article>
	</dialog>
</span>
