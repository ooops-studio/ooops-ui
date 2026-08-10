<script lang="ts">
	import {createTooltipController} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import {portal} from './portal'
	type Props = {id?: string; content: string; openDelayMs?: number; closeDelayMs?: number; touch?: 'disabled' | 'longpress'; portal?: boolean; class?: string; children: Snippet}
	const generatedId = $props.id()
	let {id = generatedId, content, openDelayMs = 500, closeDelayMs = 80, touch = 'disabled', portal: usePortal = true, class: className = '', children}: Props = $props()
	let trigger: HTMLElement | null = $state(null), tooltip: HTMLElement | null = $state(null), open = $state(false)
	onMount(() => { const controller = createTooltipController({getTrigger: () => trigger, getTooltip: () => tooltip, openDelayMs, closeDelayMs, touch, portal: usePortal}); const unsubscribe = controller.subscribe((next) => { open = next.open }); controller.mount(); return () => { unsubscribe(); controller.destroy() } })
</script>

<span bind:this={trigger} class={`ooops-tooltip-trigger ${className}`.trim()} data-part="trigger">{@render children()}</span>
<div use:portal={usePortal} bind:this={tooltip} {id} role="tooltip" hidden={!open} data-part="content" data-state={open ? 'open' : 'closed'}>{content}<span aria-hidden="true" data-part="arrow"></span></div>
