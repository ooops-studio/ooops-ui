<script lang="ts">
	import type {Snippet} from 'svelte'

	type Props = {id?: string; controlId?: string; label?: string; description?: string; hint?: string; error?: string; required?: boolean; pending?: boolean; disabled?: boolean; class?: string; children?: Snippet}
	const generatedId = $props.id()
	let {id = generatedId, controlId = `${id}-control`, label, description, hint, error, required = false, pending = false, disabled = false, class: className = '', children}: Props = $props()
</script>

<div id={id} class={`ooops-field ${className}`.trim()} data-control-id={controlId} data-part="root" data-invalid={error ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'} data-pending={pending ? 'true' : 'false'}>
	{#if label}<label for={controlId} data-part="label">{label}{#if required}<span aria-hidden="true">*</span>{/if}</label>{/if}
	{#if description}<p id={`${id}-description`} data-part="description">{description}</p>{/if}
	{#if children}<div data-part="control">{@render children()}</div>{/if}
	{#if hint && !error}<p id={`${id}-hint`} data-part="hint">{hint}</p>{/if}
	{#if error}<p id={`${id}-error`} data-part="error" aria-live="polite">{error}</p>{/if}
</div>
