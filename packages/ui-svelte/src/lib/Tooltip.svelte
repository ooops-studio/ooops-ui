<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createTooltipController} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import {portal} from './portal'
	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; id?: string; content: string; openDelayMs?: number; closeDelayMs?: number; touch?: 'disabled' | 'longpress'; portal?: boolean; class?: string; children: Snippet}
	const generatedId = $props.id()
	let {id = generatedId, content, openDelayMs = 500, closeDelayMs = 80, touch = 'disabled', portal: usePortal = true, parts, class: className = '', children}: Props = $props()
	let trigger: HTMLElement | null = $state(null), tooltip: HTMLElement | null = $state(null), open = $state(false)
	onMount(() => { const controller = createTooltipController({getTrigger: () => trigger, getTooltip: () => tooltip, openDelayMs, closeDelayMs, touch, portal: usePortal}); const unsubscribe = controller.subscribe((next) => { open = next.open }); controller.mount(); return () => { unsubscribe(); controller.destroy() } })
</script>

<span bind:this={trigger}  data-ooops-ui {...getUiPart(parts, 'trigger', `ooops-tooltip-trigger ${className}`.trim(), undefined)} data-part="trigger">{@render children()}</span>
<div use:portal={usePortal} bind:this={tooltip} {id} role="tooltip" hidden={!open} data-ooops-ui {...getUiPart(parts, 'content')} data-part="content" data-state={open ? 'open' : 'closed'}>{content}<span aria-hidden="true" data-ooops-ui {...getUiPart(parts, 'arrow')} data-part="arrow"></span></div>
