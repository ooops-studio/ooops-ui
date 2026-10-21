<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import Button from './Button.svelte'
	import type {IconButtonProps} from './button-types.js'

	let {parts, label, children, elementRef = $bindable(null), ...props}: IconButtonProps = $props()
	const name = $derived.by(() => {
		if (!label?.trim()) throw new Error('IconButton requires a nonempty accessible label')
		return label.trim()
	})
</script>

<Button {...props} {parts} bind:elementRef aria-label={name} data-icon-only="true">
	{#if children}<span aria-hidden="true" data-ooops-ui {...getUiPart(parts, 'icon')} data-part="icon">{@render children()}</span>{/if}
</Button>
