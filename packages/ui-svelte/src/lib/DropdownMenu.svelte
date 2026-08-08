<script lang="ts">
	import {createMenuController, type MenuState} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import {portal} from './portal'
	import type {DropdownMenuItem} from './types.js'
	type Props = {id?: string; triggerLabel?: string; ariaLabel?: string; items: DropdownMenuItem[]; open?: boolean; loop?: boolean; portal?: boolean; class?: string; trigger?: Snippet; item?: Snippet<[DropdownMenuItem]>; onSelect?: (item: DropdownMenuItem) => void}
	const generatedId = $props.id()
	let {id = generatedId, triggerLabel = 'Menu', ariaLabel = 'Menu', items, open = $bindable(false), loop = true, portal: usePortal = true, class: className = '', trigger, item, onSelect}: Props = $props()
	let triggerElement: HTMLButtonElement | null = $state(null), menu: HTMLElement | null = $state(null), state: MenuState = $state({open, activeIndex: -1, mounted: false}), controller: ReturnType<typeof createMenuController> | null = null
	const findItem = (element: HTMLElement) => { const id = element.dataset.id; const direct = items.find((entry) => entry.id === id); return direct ?? items.flatMap((entry) => entry.children ?? []).find((entry) => entry.id === id) }
	onMount(() => { controller = createMenuController({open, loop, portal: usePortal, getTrigger: () => triggerElement, getMenu: () => menu, getItems: () => Array.from(menu?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []), getSubmenu: (entry) => entry.nextElementSibling as HTMLElement | null, onOpenChange: (next) => { open = next }, onSelect: (element) => { const selected = findItem(element); if (selected) onSelect?.(selected) }}); const unsubscribe = controller.subscribe((next) => { state = next }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => { if (!controller) return; if (open && !controller.getState().open) controller.open(false); if (!open && controller.getState().open) controller.close(false) })
</script>

<span class={`ooops-menu ${className}`.trim()} data-part="root" data-state={state.open ? 'open' : 'closed'}>
	<button bind:this={triggerElement} type="button" aria-haspopup="menu" aria-controls={`${id}-menu`} aria-expanded={state.open} data-part="trigger">{#if trigger}{@render trigger()}{:else}{triggerLabel}{/if}</button>
</span>
<div use:portal={usePortal} bind:this={menu} id={`${id}-menu`} role="menu" aria-label={ariaLabel} hidden={!state.open} data-part="content">
	{#each items as entry (entry.id)}
		{#if entry.type === 'separator'}<hr data-part="separator" />
		{:else if entry.type === 'label'}<div data-part="label">{entry.label}</div>
		{:else if entry.href}<a href={entry.href} role="menuitem" aria-disabled={entry.disabled ? 'true' : undefined} data-id={entry.id} data-value={entry.value ?? entry.id} data-label={entry.label} data-part="item">{#if item}{@render item(entry)}{:else}{entry.label}{/if}</a>
		{:else}
			<div data-part={entry.children?.length ? 'submenu-group' : 'item-wrapper'}>
				<button type="button" role={entry.type === 'checkbox' ? 'menuitemcheckbox' : entry.type === 'radio' ? 'menuitemradio' : 'menuitem'} aria-checked={entry.type === 'checkbox' || entry.type === 'radio' ? Boolean(entry.checked) : undefined} aria-haspopup={entry.children?.length ? 'menu' : undefined} aria-expanded={entry.children?.length ? false : undefined} disabled={entry.disabled} data-id={entry.id} data-value={entry.value ?? entry.id} data-group={entry.group} data-label={entry.label} data-keep-open={entry.keepOpen ? 'true' : 'false'} data-part={entry.children?.length ? 'submenu-trigger' : 'item'}>{#if entry.type === 'checkbox' || entry.type === 'radio'}<span data-part="indicator"></span>{/if}{#if item}{@render item(entry)}{:else}{entry.label}{/if}</button>
				{#if entry.children?.length}<div role="menu" aria-label={entry.label} data-submenu="true" data-part="submenu-content" hidden>{#each entry.children as child (child.id)}<button type="button" role={child.type === 'checkbox' ? 'menuitemcheckbox' : child.type === 'radio' ? 'menuitemradio' : 'menuitem'} aria-checked={child.type === 'checkbox' || child.type === 'radio' ? Boolean(child.checked) : undefined} disabled={child.disabled} data-id={child.id} data-value={child.value ?? child.id} data-group={child.group} data-label={child.label} data-part="item">{#if item}{@render item(child)}{:else}{child.label}{/if}</button>{/each}</div>{/if}
			</div>
		{/if}
	{/each}
</div>
