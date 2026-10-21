<script lang="ts">
	import {connectOverlayTrigger, createMenuController, resolveUiMessages, type MenuState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import {portal} from './portal'
	import type {DropdownMenuItem} from './types.js'
	type Props = {anchorEl?: HTMLElement | null; portalTarget?: HTMLElement | null; placement?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'center' | 'end'; offset?: number; zIndex?: number; matchAnchorWidth?: boolean; beforeClose?: (reason: import('@ooopsstudio/ui-primitives').LayerCloseReason) => boolean | void; id?: string; triggerLabel?: string; ariaLabel?: string; items: DropdownMenuItem[]; open?: boolean; loop?: boolean; portal?: boolean; messages?: Partial<UiMessages>; class?: string; trigger?: Snippet; item?: Snippet<[DropdownMenuItem]>; onSelect?: (item: DropdownMenuItem) => void}
	const generatedId = $props.id()
	let {anchorEl, portalTarget, placement = 'bottom', align = 'start', offset = 8, zIndex = 1000, matchAnchorWidth = false, beforeClose, id = generatedId, triggerLabel, ariaLabel, items, open = $bindable(false), loop = true, portal: usePortal = true, messages, class: className = '', trigger, item, onSelect}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let triggerElement: HTMLButtonElement | null = $state(null), menu: HTMLElement | null = $state(null), state: MenuState = $state({open, activeIndex: -1, mounted: false}), controller: ReturnType<typeof createMenuController> | null = null
	const findItem = (element: HTMLElement): DropdownMenuItem | undefined => {
		const find = (entries: DropdownMenuItem[]): DropdownMenuItem | undefined => {
			for (const entry of entries) { if (entry.id === element.dataset.id) return entry; const child = find(entry.children ?? []); if (child) return child }
		}
		return find(items)
	}

	onMount(() => { controller = createMenuController({open, loop, placement, align, offset, zIndex, matchAnchorWidth, beforeClose: reason => beforeClose?.(reason), getPortalRoot: () => portalTarget, portal: usePortal, getTrigger: () => anchorEl ?? triggerElement, getMenu: () => menu, getItems: () => Array.from(menu?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []), getSubmenu: (entry) => entry.nextElementSibling as HTMLElement | null, onOpenChange: (next) => { open = next }, onSelect: (element) => { const selected = findItem(element); if (selected) {
 const update = (entries: DropdownMenuItem[]): DropdownMenuItem[] => entries.map(entry => ({...entry, ...(entry.type === 'checkbox' && entry.id === selected.id ? {checked: element.getAttribute('aria-checked') === 'true'} : {}), ...(selected.type === 'radio' && entry.type === 'radio' && entry.group === selected.group ? {checked: entry.id === selected.id} : {}), ...(entry.children ? {children: update(entry.children)} : {})}))
 items = update(items); onSelect?.(findItem(element) ?? selected)
} }}); const unsubscribe = controller.subscribe((next) => { state = next }); const restoreTrigger = anchorEl ? connectOverlayTrigger(anchorEl, `${id}-menu`, 'menu') : () => {}; controller.mount(); return () => { unsubscribe(); controller?.destroy(); restoreTrigger(); controller = null } })
	$effect(() => { if (!controller) return; if (open && !controller.getState().open) controller.open(false); if (!open && controller.getState().open) controller.close(false) })
</script>

<span class={`ooops-menu ${className}`.trim()} data-ooops-ui data-part="root" data-state={state.open ? 'open' : 'closed'}>
	{#if !anchorEl}<button bind:this={triggerElement} type="button" aria-haspopup="menu" aria-controls={`${id}-menu`} aria-expanded={state.open} data-ooops-ui data-part="trigger">{#if trigger}{@render trigger()}{:else}{triggerLabel ?? uiMessages.menu}{/if}</button>{/if}
</span>
<div use:portal={{enabled: usePortal, target: portalTarget}} bind:this={menu} id={`${id}-menu`} role="menu" aria-label={ariaLabel ?? uiMessages.menu} hidden={!state.open} data-ooops-ui data-part="content">
	{@render renderEntries(items)}
</div>

{#snippet renderEntries(entries: DropdownMenuItem[])}
	{#each entries as entry (entry.id)}
		{#if entry.type === 'separator'}<hr data-ooops-ui data-part="separator" />
		{:else if entry.type === 'label'}<div data-ooops-ui data-part="label">{entry.label}</div>
		{:else if entry.href}<a href={entry.href} role="menuitem" aria-disabled={entry.disabled ? 'true' : undefined} data-id={entry.id} data-value={entry.value ?? entry.id} data-label={entry.label} data-ooops-ui data-part="item">{#if item}{@render item(entry)}{:else}{entry.label}{/if}</a>
		{:else}
			<div data-ooops-ui data-part={entry.children?.length ? 'submenu-group' : 'item-wrapper'}>
				<button type="button" role={entry.type === 'checkbox' ? 'menuitemcheckbox' : entry.type === 'radio' ? 'menuitemradio' : 'menuitem'} aria-checked={entry.type === 'checkbox' || entry.type === 'radio' ? Boolean(entry.checked) : undefined} aria-haspopup={entry.children?.length ? 'menu' : undefined} aria-expanded={entry.children?.length ? false : undefined} disabled={entry.disabled} data-id={entry.id} data-value={entry.value ?? entry.id} data-group={entry.group} data-label={entry.label} data-keep-open={entry.keepOpen ? 'true' : 'false'} data-ooops-ui data-part={entry.children?.length ? 'submenu-trigger' : 'item'}>{#if entry.type === 'checkbox' || entry.type === 'radio'}<span data-ooops-ui data-part="indicator"></span>{/if}{#if item}{@render item(entry)}{:else}{entry.label}{/if}</button>
				{#if entry.children?.length}<div role="menu" aria-label={entry.label} data-submenu="true" data-ooops-ui data-part="submenu-content" hidden>{@render renderEntries(entry.children)}</div>{/if}
			</div>
		{/if}
	{/each}
{/snippet}
