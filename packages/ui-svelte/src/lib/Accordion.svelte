<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createAccordionController, type AccordionState} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import type {AccordionItem} from './types.js'
	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; id?: string; items: AccordionItem[]; openIds?: string[]; type?: 'single' | 'multiple'; collapsible?: boolean; headingLevel?: 2 | 3 | 4 | 5 | 6; class?: string; trigger?: Snippet<[AccordionItem, boolean]>; panel?: Snippet<[AccordionItem]>; onChange?: (ids: readonly string[]) => void}
	const generatedId = $props.id()
	let {id = generatedId, items, openIds = $bindable([]), type = 'single', collapsible = true, headingLevel = 3, parts, class: className = '', trigger, panel, onChange}: Props = $props()
	let triggers: HTMLElement[] = $state([]), panels: HTMLElement[] = $state([]), state: AccordionState = $state({openIds, mounted: false}), controller: ReturnType<typeof createAccordionController> | null = null
	onMount(() => { controller = createAccordionController({openIds, defaultOpenIds: openIds, type, collapsible, getTriggers: () => triggers, getPanels: () => panels, onChange: (next) => { openIds = [...next]; onChange?.(next) }}); const unsubscribe = controller.subscribe((next) => { state = next }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => controller?.configure({type, collapsible}))
	$effect(() => { if (controller && JSON.stringify(controller.getState().openIds) !== JSON.stringify(openIds)) controller.setOpenIds(openIds) })
</script>

<div id={id}  data-accordion-root data-ooops-ui {...getUiPart(parts, 'root', `ooops-accordion ${className}`.trim(), undefined)} data-part="root" data-type={type}>
	{#each items as entry, index (entry.id)}
		<div data-ooops-ui {...getUiPart(parts, 'item')} data-part="item" data-state={state.openIds.includes(entry.id) ? 'open' : 'closed'} data-disabled={entry.disabled ? 'true' : 'false'}>
			<svelte:element this={`h${headingLevel}`} data-ooops-ui {...getUiPart(parts, 'heading')} data-part="heading"><button bind:this={triggers[index]} type="button" id={`${id}-trigger-${entry.id}`} aria-controls={`${id}-panel-${entry.id}`} aria-expanded={state.openIds.includes(entry.id)} disabled={entry.disabled} data-accordion-trigger data-value={entry.id} data-ooops-ui {...getUiPart(parts, 'trigger')} data-part="trigger">{#if trigger}{@render trigger(entry, state.openIds.includes(entry.id))}{:else}{entry.title}{/if}<span aria-hidden="true" data-ooops-ui {...getUiPart(parts, 'indicator')} data-part="indicator"></span></button></svelte:element>
			<div bind:this={panels[index]} id={`${id}-panel-${entry.id}`} role="region" aria-labelledby={`${id}-trigger-${entry.id}`} hidden={!state.openIds.includes(entry.id)} data-value={entry.id} data-ooops-ui {...getUiPart(parts, 'panel')} data-part="panel">{#if panel}{@render panel(entry)}{:else}{entry.content ?? ''}{/if}</div>
		</div>
	{/each}
</div>
