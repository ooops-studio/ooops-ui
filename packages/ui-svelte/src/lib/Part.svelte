<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import type {Snippet} from 'svelte'
	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; part: string; as?: keyof HTMLElementTagNameMap; state?: string; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; selected?: boolean; active?: boolean; class?: string; children?: Snippet; [attribute: string]: unknown}
	let {part, as: tag = 'div', state, orientation, disabled, selected, active, parts, class: className, children, ...attributes}: Props = $props()
</script>
<svelte:element this={tag} {...attributes} {...getUiPart(parts, part, className, typeof attributes.style === 'string' ? attributes.style : undefined)} data-ooops-ui data-part={part} data-state={state} data-orientation={orientation} data-disabled={disabled === undefined ? undefined : String(disabled)} data-selected={selected === undefined ? undefined : String(selected)} data-active={active === undefined ? undefined : String(active)}>{#if children}{@render children()}{/if}</svelte:element>
