<script lang="ts">
	import {getUiPart, connectOverlayTrigger, createPopoverController, resolveUiMessages, type PopoverAlign, type PopoverPlacement, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	import {portal} from './portal'

	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined;
		anchorEl?: HTMLElement | null
		portalTarget?: HTMLElement | null
		offset?: number
		zIndex?: number
		matchAnchorWidth?: boolean
		beforeClose?: (reason: import('@ooopsstudio/ui-primitives').PopoverCloseReason) => boolean | void
		id?: string
		open?: boolean
		placement?: PopoverPlacement
		align?: PopoverAlign
		role?: 'dialog' | 'region' | 'menu' | 'listbox'
		ariaLabel?: string
		closeOnOutside?: boolean
		closeOnOutsideFocus?: boolean
		closeOnEscape?: boolean
		focusOnOpen?: boolean
		trapFocus?: boolean
		portal?: boolean
		messages?: Partial<UiMessages>
		class?: string
		triggerLabel?: string
		trigger?: Snippet<[boolean]>
		children?: Snippet
		onClose?: (reason: string) => void
	}

	const generatedId = $props.id()
	let {
		anchorEl, portalTarget, offset = 8, zIndex = 1000, matchAnchorWidth = false, beforeClose, id = generatedId, open = $bindable(false), placement = 'bottom', align = 'start', role = 'dialog',
		ariaLabel, closeOnOutside = true, closeOnOutsideFocus = false, closeOnEscape = true, focusOnOpen = false,
		trapFocus = false, portal: usePortal = true, messages, parts, class: className = '', triggerLabel, trigger, children, onClose
	}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null)
	let anchor: HTMLButtonElement | null = $state(null)
	let panel: HTMLElement | null = $state(null)
	let controller: ReturnType<typeof createPopoverController> | null = null

	onMount(() => {
		controller = createPopoverController({
			open, placement, align, closeOnOutsidePointer: closeOnOutside, closeOnOutsideFocus, closeOnEscape, focusOnOpen, trapFocus,
			getRoot: () => root, getAnchor: () => anchorEl ?? anchor, portal: usePortal, getPortalRoot: () => portalTarget, offset, zIndex, matchAnchorWidth, beforeClose: reason => beforeClose?.(reason), getPanel: () => panel,
			onOpenChange: (next) => { open = next }, onClose: reason => onClose?.(reason)
		})
		const restoreTrigger = anchorEl ? connectOverlayTrigger(anchorEl, `${id}-panel`, role) : () => {}; controller.mount()
		const toggle = () => controller?.toggle()
		anchorEl?.addEventListener('click', toggle)
		return () => { anchorEl?.removeEventListener('click', toggle); controller?.destroy(); restoreTrigger(); controller = null }
	})
	$effect(() => {
		if (!controller) return
		if (open && !controller.getState().open) controller.open()
		if (!open && controller.getState().open) controller.close()
	})
</script>

<span bind:this={root}  data-ooops-ui {...getUiPart(parts, 'root', `ooops-popover-root ${className}`.trim(), undefined)} data-part="root">
	{#if !anchorEl}<button bind:this={anchor} type="button" aria-haspopup={role === 'region' ? false : role} aria-controls={`${id}-panel`} aria-expanded={open} onclick={() => controller?.toggle()} data-ooops-ui {...getUiPart(parts, 'trigger')} data-part="trigger">
		{#if trigger}{@render trigger(open)}{:else}{triggerLabel ?? uiMessages.open}{/if}
	</button>{/if}
</span>
<div use:portal={{enabled: usePortal, target: portalTarget ?? null}} bind:this={panel} id={`${id}-panel`} {role} aria-label={ariaLabel ?? uiMessages.popover} data-ooops-ui {...getUiPart(parts, 'panel')} data-part="panel" hidden={!open}>
	{#if children}{@render children()}{/if}
</div>
