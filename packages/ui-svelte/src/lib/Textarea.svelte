<script lang="ts">
	import {createTextareaController} from '@ooopsstudio/ui-primitives'
	import {onMount} from 'svelte'
	type Props = {id?: string; name?: string; label?: string; description?: string; hint?: string; error?: string; value?: string; placeholder?: string; required?: boolean; disabled?: boolean; readonly?: boolean; rows?: number; maxlength?: number; autoResize?: boolean; minRows?: number; maxRows?: number; showCount?: boolean; class?: string; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, description, hint, error, value = $bindable(''), placeholder, required = false, disabled = false, readonly = false, rows = 3, maxlength, autoResize = false, minRows, maxRows, showCount = false, class: className = '', onChange}: Props = $props()
	let element: HTMLTextAreaElement | null = $state(null)
	let controller: ReturnType<typeof createTextareaController> | null = null
	const describedBy = $derived([description ? `${id}-description` : '', error ? `${id}-error` : hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined)
	onMount(() => {
		controller = createTextareaController({value, defaultValue: value, autoResize, ...(minRows === undefined ? {} : {minRows}), ...(maxRows === undefined ? {} : {maxRows}), getElement: () => element, onValueChange: (next) => { value = next; onChange?.(next) }})
		controller.mount()
		return () => { controller?.destroy(); controller = null }
	})
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<div class={`ooops-textarea ${className}`.trim()} data-part="root" data-invalid={error ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'}>
	{#if label}<label for={id} data-part="label">{label}</label>{/if}
	{#if description}<p id={`${id}-description`} data-part="description">{description}</p>{/if}
	<textarea bind:this={element} {id} {name} {placeholder} {required} {disabled} {readonly} {rows} maxlength={maxlength} aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined} data-part="control"></textarea>
	{#if showCount}<output for={id} data-part="counter">{value.length}{#if maxlength !== undefined}/{maxlength}{/if}</output>{/if}
	{#if hint && !error}<p id={`${id}-hint`} data-part="hint">{hint}</p>{/if}
	{#if error}<p id={`${id}-error`} data-part="error" aria-live="polite">{error}</p>{/if}
</div>
