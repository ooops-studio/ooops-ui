<script lang="ts">
	import {createInputController} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	type Props = {id?: string; name?: string; type?: string; label?: string; description?: string; hint?: string; error?: string; value?: string; placeholder?: string; required?: boolean; disabled?: boolean; clearable?: boolean; revealable?: boolean; class?: string; prefix?: Snippet; suffix?: Snippet; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, type = 'text', label, description, hint, error, value = $bindable(''), placeholder, required = false, disabled = false, clearable = false, revealable = false, class: className = '', prefix, suffix, onChange}: Props = $props()
	let input: HTMLInputElement | null = $state(null)
	let revealed = $state(false)
	let controller: ReturnType<typeof createInputController> | null = null
	const describedBy = $derived([description ? `${id}-description` : '', error ? `${id}-error` : hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined)
	onMount(() => {
		controller = createInputController({value, defaultValue: value, getElement: () => input, onValueChange: (next) => { value = next; onChange?.(next) }})
		controller.mount()
		return () => { controller?.destroy(); controller = null }
	})
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<div class={`ooops-input ${className}`.trim()} data-part="root" data-invalid={error ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'} data-revealed={revealed ? 'true' : 'false'}>
	{#if label}<label for={id} data-part="label">{label}</label>{/if}
	{#if description}<p id={`${id}-description`} data-part="description">{description}</p>{/if}
	<div data-part="input-shell">
		{#if prefix}<span data-part="prefix">{@render prefix()}</span>{/if}
		<input bind:this={input} {id} {name} type={type === 'password' && revealed ? 'text' : type} {placeholder} {required} {disabled} aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined} data-part="control" />
		{#if clearable}<button type="button" data-part="clear" aria-label="Clear" disabled={disabled || !value} onclick={() => controller?.setValue('', true)}>×</button>{/if}
		{#if revealable && type === 'password'}<button type="button" data-part="reveal" aria-label={revealed ? 'Hide password' : 'Show password'} aria-pressed={revealed} onclick={() => { revealed = !revealed; input?.focus() }}>◉</button>{/if}
		{#if suffix}<span data-part="suffix">{@render suffix()}</span>{/if}
	</div>
	{#if hint && !error}<p id={`${id}-hint`} data-part="hint">{hint}</p>{/if}
	{#if error}<p id={`${id}-error`} data-part="error" aria-live="polite">{error}</p>{/if}
</div>
