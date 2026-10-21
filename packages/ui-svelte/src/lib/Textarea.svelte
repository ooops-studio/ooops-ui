<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import type {HTMLTextareaAttributes} from 'svelte/elements'
	import {createTextareaController} from '@ooopsstudio/ui-primitives'
	import {onMount} from 'svelte'
	type Props = Omit<HTMLTextareaAttributes, 'value' | 'type' | 'class' | 'children'> & {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; elementRef?: HTMLTextAreaElement | null; ariaLabel?: string;id?: string; name?: string; label?: string; description?: string; hint?: string; error?: string; value?: string; placeholder?: string; required?: boolean; disabled?: boolean; readonly?: boolean; rows?: number; maxlength?: number; autoResize?: boolean; minRows?: number; maxRows?: number; showCount?: boolean; class?: string; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, description, hint, error, value = $bindable(''), placeholder, required = false, disabled = false, readonly = false, rows = 3, maxlength, autoResize = false, minRows, maxRows, showCount = false, parts, class: className = '', onChange, elementRef = $bindable(null), ariaLabel, ...native}: Props = $props()
	let element: HTMLTextAreaElement | null = $state(null)
	let controller: ReturnType<typeof createTextareaController> | null = null
	const commitValue = (next: string) => {
		value = next
		onChange?.(next)
	}
	const describedBy = $derived([native['aria-describedby'], description ? `${id}-description` : '', error ? `${id}-error` : hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined)
	$effect(() => { elementRef = element })
	onMount(() => {
		controller = createTextareaController({value, defaultValue: value, autoResize, ...(minRows === undefined ? {} : {minRows}), ...(maxRows === undefined ? {} : {maxRows}), getElement: () => element, onValueChange: commitValue})
		controller.mount()
		return () => { controller?.destroy(); controller = null; elementRef = null }
	})
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<div  data-ooops-ui {...getUiPart(parts, 'root', `ooops-textarea ${className}`.trim(), undefined)} data-part="root" data-invalid={error ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'}>
	{#if label}<label for={id} data-ooops-ui {...getUiPart(parts, 'label')} data-part="label">{label}</label>{/if}
	{#if description}<p id={`${id}-description`} data-ooops-ui {...getUiPart(parts, 'description')} data-part="description">{description}</p>{/if}
	<textarea {...native} aria-label={ariaLabel ?? native['aria-label']} bind:this={element} bind:value {id} {name} {placeholder} {required} {disabled} {readonly} {rows} maxlength={maxlength} aria-describedby={describedBy} aria-invalid={error ? 'true' : native['aria-invalid']} data-ooops-ui {...getUiPart(parts, 'control', undefined, typeof native.style === 'string' ? native.style : undefined)} data-part="control"></textarea>
	{#if showCount}<output for={id} data-ooops-ui {...getUiPart(parts, 'counter')} data-part="counter">{value.length}{#if maxlength !== undefined}/{maxlength}{/if}</output>{/if}
	{#if hint && !error}<p id={`${id}-hint`} data-ooops-ui {...getUiPart(parts, 'hint')} data-part="hint">{hint}</p>{/if}
	{#if error}<p id={`${id}-error`} data-ooops-ui {...getUiPart(parts, 'error')} data-part="error" aria-live="polite">{error}</p>{/if}
</div>
