<script lang="ts">
	import type {Snippet} from 'svelte'
	import {getFieldControlAttributes} from '@ooopsstudio/ui-primitives'

	type Props = {id?: string; controlId?: string; label?: string; description?: string; hint?: string; error?: string; required?: boolean; pending?: boolean; disabled?: boolean; class?: string; children?: Snippet<[ReturnType<typeof getFieldControlAttributes>]>}
	const generatedId = $props.id()
	let {id = generatedId, controlId = `${id}-control`, label, description, hint, error, required = false, pending = false, disabled = false, class: className = '', children}: Props = $props()
	const control = $derived(getFieldControlAttributes({id, controlId, description, hint, error, required, disabled, pending}))
</script>

<div id={id} class={`ooops-field ${className}`.trim()} data-control-id={controlId} data-ooops-ui data-part="root" data-invalid={error ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'} data-pending={pending ? 'true' : 'false'}>
	{#if label}<label for={controlId} data-ooops-ui data-part="label">{label}{#if required}<span aria-hidden="true">*</span>{/if}</label>{/if}
	{#if description}<p id={`${id}-description`} data-ooops-ui data-part="description">{description}</p>{/if}
	{#if children}<div data-ooops-ui data-part="control">{@render children(control)}</div>{/if}
	{#if hint && !error}<p id={`${id}-hint`} data-ooops-ui data-part="hint">{hint}</p>{/if}
	{#if error}<p id={`${id}-error`} data-ooops-ui data-part="error" aria-live="polite">{error}</p>{/if}
</div>
