<script lang="ts">
	import {createPopoverController, type PopoverAlign, type PopoverPlacement, type PopoverState} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	import {portal} from './portal'

	type Props = {
		id?: string
		open?: boolean
		placement?: PopoverPlacement
		align?: PopoverAlign
		role?: 'dialog' | 'region' | 'menu' | 'listbox'
		ariaLabel?: string
		closeOnOutside?: boolean
		closeOnEscape?: boolean
		focusOnOpen?: boolean
		trapFocus?: boolean
		portal?: boolean
		class?: string
		triggerLabel?: string
		trigger?: Snippet<[boolean]>
		children?: Snippet
		onClose?: (reason: string) => void
	}

	const generatedId = $props.id()
	let {
		id = generatedId, open = $bindable(false), placement = 'bottom', align = 'start', role = 'dialog',
		ariaLabel = 'Popover', closeOnOutside = true, closeOnEscape = true, focusOnOpen = false,
		trapFocus = false, portal: usePortal = true, class: className = '', triggerLabel = 'Open', trigger, children, onClose
	}: Props = $props()
	let root: HTMLElement | null = $state(null)
	let anchor: HTMLButtonElement | null = $state(null)
	let panel: HTMLElement | null = $state(null)
	let controller: ReturnType<typeof createPopoverController> | null = null
	let state: PopoverState = $state({open: false, placement: 'bottom', mounted: false})

	onMount(() => {
		controller = createPopoverController({
			open, placement, align, closeOnOutsidePointer: closeOnOutside, closeOnEscape, focusOnOpen, trapFocus,
			getRoot: () => root, getAnchor: () => anchor, getPanel: () => panel,
			onOpenChange: (next) => { open = next }, onClose
		})
		const unsubscribe = controller.subscribe((next) => { state = next })
		controller.mount()
		return () => { unsubscribe(); controller?.destroy(); controller = null }
	})
	$effect(() => {
		if (!controller) return
		if (open && !controller.getState().open) controller.open()
		if (!open && controller.getState().open) controller.close()
	})
</script>

<span bind:this={root} class={`ooops-popover-root ${className}`.trim()} data-part="root">
	<button bind:this={anchor} type="button" aria-haspopup={role} aria-controls={`${id}-panel`} aria-expanded={state.open} onclick={() => controller?.toggle()} data-part="trigger">
		{#if trigger}{@render trigger(state.open)}{:else}{triggerLabel}{/if}
	</button>
</span>
<div use:portal={usePortal} bind:this={panel} id={`${id}-panel`} {role} aria-label={ariaLabel} data-part="panel" hidden={!state.open}>
	{#if children}{@render children()}{/if}
</div>
