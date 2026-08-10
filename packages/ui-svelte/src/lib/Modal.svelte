<script lang="ts">
	import {createDialogController, resolveUiMessages, type DialogCloseReason, type DialogState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	type Props = {
		id?: string
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
		id = generatedId, open = $bindable(false), title, description, ariaLabel, size = 'md',
		closeLabel, closeOnBackdrop = true, closeOnEscape = true,
		showCloseButton = true, messages, class: className = '', trigger, children, footer, onClose
	}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null)
	let dialog: HTMLDialogElement | null = $state(null)
	let triggerButton: HTMLButtonElement | null = $state(null)
	let closeButton: HTMLButtonElement | null = $state(null)
	let controller: ReturnType<typeof createDialogController> | null = null
	let state: DialogState = $state({open, busy: false, mounted: false, closeReason: null})

	onMount(() => {
		controller = createDialogController({
			open, closeOnBackdrop, closeOnEscape, getRoot: () => root, getDialog: () => dialog,
			getInitialFocus: () => closeButton, getRestoreFocusTo: () => triggerButton,
			onOpenChange: (next) => { open = next }, onClose,
			eventNames: {close: 'ooops:modal-close'}
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
</script>

{#if trigger}<button bind:this={triggerButton} type="button" onclick={() => controller?.open()} aria-haspopup="dialog" data-part="trigger">{@render trigger()}</button>{/if}
<span bind:this={root} class={`ooops-modal-root ${className}`.trim()} data-part="root" data-size={size}>
	<dialog bind:this={dialog} aria-label={title ? undefined : ariaLabel ?? uiMessages.dialog} aria-labelledby={title ? `${id}-title` : undefined} aria-describedby={description ? `${id}-description` : undefined} data-part="dialog">
		<article data-part="surface">
			{#if showCloseButton}<button bind:this={closeButton} type="button" onclick={() => controller?.close('close')} aria-label={closeLabel ?? uiMessages.closeDialog} data-part="close">×</button>{/if}
			{#if title || description}<header data-part="header">{#if title}<h2 id={`${id}-title`}>{title}</h2>{/if}{#if description}<p id={`${id}-description`}>{description}</p>{/if}</header>{/if}
			{#if children}<div data-part="body">{@render children()}</div>{/if}
			{#if footer}<footer data-part="footer">{@render footer()}</footer>{/if}
		</article>
	</dialog>
</span>
