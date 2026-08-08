<script lang="ts">
	import {createTabsController, type TabsState} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import type {TabItem} from './types.js'
	type Props = {id?: string; items: TabItem[]; activeId?: string; mode?: 'panels' | 'navigation'; activation?: 'automatic' | 'manual'; orientation?: 'horizontal' | 'vertical'; loop?: boolean; class?: string; tab?: Snippet<[TabItem, boolean]>; panel?: Snippet<[TabItem]>; onChange?: (id: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, items, activeId = $bindable(''), mode = 'panels', activation = 'automatic', orientation = 'horizontal', loop = true, class: className = '', tab, panel, onChange}: Props = $props()
	let tabs: HTMLElement[] = $state([]), panels: HTMLElement[] = $state([]), state: TabsState = $state({activeId, focusedId: activeId, mounted: false}), controller: ReturnType<typeof createTabsController> | null = null
	onMount(() => { const initialActive = activeId || items.find((entry) => !entry.disabled)?.id || ''; activeId = initialActive; controller = createTabsController({activeId: initialActive, defaultActiveId: initialActive, mode, activation, orientation, loop, getTabs: () => tabs, getPanels: () => panels, onChange: (next) => { activeId = next; onChange?.(next) }}); const unsubscribe = controller.subscribe((next) => { state = next }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => { if (controller && controller.getState().activeId !== activeId) controller.setActive(activeId) })
</script>

<div {id} class={`ooops-tabs ${className}`.trim()} data-part="root" data-orientation={orientation} data-mode={mode}>
	<div role={mode === 'panels' ? 'tablist' : undefined} aria-orientation={mode === 'panels' ? orientation : undefined} data-part="list">
		{#each items as entry, index (entry.id)}
			{#if mode === 'navigation'}<a bind:this={tabs[index]} href={entry.href ?? '#'} aria-current={entry.id === state.activeId ? 'page' : undefined} aria-disabled={entry.disabled ? 'true' : undefined} data-tab data-value={entry.id} data-part="tab" data-active={entry.id === state.activeId ? 'true' : 'false'}>{#if tab}{@render tab(entry, entry.id === state.activeId)}{:else}{entry.label}{/if}</a>
			{:else}<button bind:this={tabs[index]} type="button" role="tab" id={`${id}-tab-${entry.id}`} aria-controls={`${id}-panel-${entry.id}`} aria-selected={entry.id === state.activeId} disabled={entry.disabled} data-tab data-value={entry.id} data-part="tab" data-active={entry.id === state.activeId ? 'true' : 'false'}>{#if tab}{@render tab(entry, entry.id === state.activeId)}{:else}{entry.label}{/if}</button>{/if}
		{/each}
		<span aria-hidden="true" data-part="indicator"></span>
	</div>
	{#if mode === 'panels'}{#each items as entry, index (entry.id)}<div bind:this={panels[index]} id={`${id}-panel-${entry.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${entry.id}`} hidden={entry.id !== state.activeId} data-value={entry.id} data-part="panel">{#if panel}{@render panel(entry)}{:else}{entry.content ?? ''}{/if}</div>{/each}{/if}
</div>
