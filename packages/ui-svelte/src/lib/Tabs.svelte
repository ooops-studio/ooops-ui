<script lang="ts">
	import {createTabsController, resolveUiMessages, type TabsState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, tick, type Snippet} from 'svelte'
	import type {TabItem} from './types.js'
	type Props = {id?: string; items: TabItem[]; activeId?: string; mode?: 'panels' | 'navigation'; renderPanels?: boolean; activation?: 'automatic' | 'manual'; orientation?: 'horizontal' | 'vertical'; loop?: boolean; ariaLabel?: string; messages?: Partial<UiMessages>; class?: string; tab?: Snippet<[TabItem, boolean]>; panel?: Snippet<[TabItem]>; onChange?: (id: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, items, activeId = $bindable(''), mode = 'panels', renderPanels = true, activation = 'automatic', orientation = 'horizontal', loop = true, ariaLabel, messages, class: className = '', tab, panel, onChange}: Props = $props()
	const selectedId = $derived(state.mounted ? state.activeId : activeId || items.find(entry => !entry.disabled)?.id || '')
	const uiMessages = $derived(resolveUiMessages(messages))
	let tabs: HTMLElement[] = $state([]), panels: HTMLElement[] = $state([]), state: TabsState = $state({activeId, focusedId: activeId, mounted: false}), controller: ReturnType<typeof createTabsController> | null = null
	onMount(() => { const initialActive = activeId || items.find((entry) => !entry.disabled)?.id || ''; activeId = initialActive; controller = createTabsController({activeId: initialActive, defaultActiveId: initialActive, mode, activation, orientation, loop, getTabs: () => tabs.filter(Boolean), getPanels: () => renderPanels ? panels.filter(Boolean) : items.map(entry => document.getElementById(entry.panelId ?? `${id}-panel-${entry.id}`)).filter((entry): entry is HTMLElement => Boolean(entry)), onChange: (next) => { activeId = next; onChange?.(next) }}); const unsubscribe = controller.subscribe((next) => { state = next }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => { if (controller && controller.getState().activeId !== activeId) controller.setActive(activeId) })
	$effect(() => controller?.configure({mode, activation, orientation, loop}))
	$effect(() => {
		items
		if (!controller) return
		void tick().then(() => controller?.refresh())
	})
</script>

<div {id} class={`ooops-tabs ${className}`.trim()} data-ooops-ui data-part="root" data-orientation={orientation} data-mode={mode}>
	<div role={mode === 'panels' ? 'tablist' : undefined} aria-label={mode === 'panels' ? ariaLabel ?? uiMessages.tabs : undefined} aria-orientation={mode === 'panels' ? orientation : undefined} data-ooops-ui data-part="list">
		{#each items as entry, index (entry.id)}
			{#if mode === 'navigation' && entry.href}<a bind:this={tabs[index]} href={entry.disabled ? undefined : entry.href} aria-current={entry.id === selectedId ? 'page' : undefined} aria-disabled={entry.disabled ? 'true' : undefined} data-tab data-value={entry.id} data-ooops-ui data-part="tab" data-active={entry.id === selectedId ? 'true' : 'false'}>{#if tab}{@render tab(entry, entry.id === selectedId)}{:else}{entry.label}{#if entry.badge !== undefined}<span data-ooops-ui data-part="badge">{entry.badge}</span>{/if}{/if}</a>
			{:else}<button bind:this={tabs[index]} type="button" role={mode === 'panels' ? 'tab' : undefined} aria-current={mode === 'navigation' && entry.id === selectedId ? 'page' : undefined} id={`${id}-tab-${entry.id}`} aria-controls={mode === 'panels' ? entry.panelId ?? `${id}-panel-${entry.id}` : undefined} aria-selected={mode === 'panels' ? entry.id === selectedId : undefined} disabled={entry.disabled} data-tab data-value={entry.id} data-ooops-ui data-part="tab" data-active={entry.id === selectedId ? 'true' : 'false'}>{#if tab}{@render tab(entry, entry.id === selectedId)}{:else}{entry.label}{#if entry.badge !== undefined}<span data-ooops-ui data-part="badge">{entry.badge}</span>{/if}{/if}</button>{/if}
		{/each}
		<span aria-hidden="true" data-ooops-ui data-part="indicator"></span>
	</div>
	{#if mode === 'panels' && renderPanels}{#each items as entry, index (entry.id)}<div bind:this={panels[index]} id={entry.panelId ?? `${id}-panel-${entry.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${entry.id}`} hidden={entry.id !== selectedId} data-value={entry.id} data-ooops-ui data-part="panel">{#if panel}{@render panel(entry)}{:else}{entry.content ?? ''}{/if}</div>{/each}{/if}
</div>
