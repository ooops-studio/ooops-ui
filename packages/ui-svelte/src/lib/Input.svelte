<script lang="ts">
	import {createInputController, resolveUiMessages, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'

	type Props = {id?: string; name?: string; type?: 'text' | 'email' | 'url' | 'tel' | 'password' | 'search' | 'number' | 'date' | 'datetime-local' | 'time' | 'color'; label?: string; description?: string; hint?: string; error?: string; value?: string; placeholder?: string; required?: boolean; disabled?: boolean; readonly?: boolean; clearable?: boolean; revealable?: boolean; autocomplete?: string; min?: string | number; max?: string | number; step?: string | number; messages?: Partial<UiMessages>; class?: string; prefix?: Snippet; suffix?: Snippet; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, type = 'text', label, description, hint, error, value = $bindable(''), placeholder, required = false, disabled = false, readonly = false, clearable = false, revealable = false, autocomplete, min, max, step, messages, class: className = '', prefix, suffix, onChange}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let input: HTMLInputElement | null = $state(null)
	let revealed = $state(false)
	let controller: ReturnType<typeof createInputController> | null = null
	let lastEmittedValue = value
	const commitValue = (next: string) => {
		value = next
		if (next === lastEmittedValue) return
		lastEmittedValue = next
		onChange?.(next)
	}
	const describedBy = $derived([description ? `${id}-description` : '', error ? `${id}-error` : hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined)
	onMount(() => {
		controller = createInputController({value, defaultValue: value, getElement: () => input, onValueChange: commitValue})
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
		<input bind:this={input} bind:value {id} {name} type={type === 'password' && revealed ? 'text' : type} {placeholder} {required} {disabled} {readonly} {autocomplete} {min} {max} {step} aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined} data-part="control" oninput={(event) => commitValue(event.currentTarget.value)} />
		{#if clearable}<button type="button" data-part="clear" aria-label={uiMessages.clear} disabled={disabled || !value} onclick={() => controller?.setValue('', true)}>×</button>{/if}
		{#if revealable && type === 'password'}<button type="button" data-part="reveal" aria-label={revealed ? uiMessages.hidePassword : uiMessages.showPassword} aria-pressed={revealed} onclick={() => { revealed = !revealed; input?.focus() }}>◉</button>{/if}
		{#if suffix}<span data-part="suffix">{@render suffix()}</span>{/if}
	</div>
	{#if hint && !error}<p id={`${id}-hint`} data-part="hint">{hint}</p>{/if}
	{#if error}<p id={`${id}-error`} data-part="error" aria-live="polite">{error}</p>{/if}
</div>
