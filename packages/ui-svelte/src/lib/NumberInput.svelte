<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createNumberInputController, resolveUiMessages, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount} from 'svelte'
	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; id?: string; name?: string; label?: string; ariaLabel?: string; ariaLabelledby?: string; ariaDescribedby?: string; value?: number | null; min?: number; max?: number; step?: number; clampOnBlur?: boolean; disabled?: boolean; required?: boolean; placeholder?: string; messages?: Partial<UiMessages>; class?: string; onChange?: (value: number | null) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, ariaLabel, ariaLabelledby, ariaDescribedby, value = $bindable(null), min, max, step = 1, clampOnBlur = false, disabled = false, required = false, placeholder, messages, parts, class: className = '', onChange}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let input: HTMLInputElement | null = $state(null)
	let increment: HTMLButtonElement | null = $state(null)
	let decrement: HTMLButtonElement | null = $state(null)
	let controller: ReturnType<typeof createNumberInputController> | null = null
	onMount(() => { controller = createNumberInputController({value, defaultValue: value, ...(min === undefined ? {} : {min}), ...(max === undefined ? {} : {max}), step, clampOnBlur, getInput: () => input, getIncrement: () => increment, getDecrement: () => decrement, onChange: (next) => { value = next; onChange?.(next) }}); controller.mount(); return () => { controller?.destroy(); controller = null } })
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
	$effect(() => controller?.configure({min, max, step, clampOnBlur}))
</script>

<div  data-ooops-ui {...getUiPart(parts, 'root', `ooops-number-input ${className}`.trim(), undefined)} data-part="root" data-disabled={disabled ? 'true' : 'false'}>
	{#if label}<label for={id} data-ooops-ui {...getUiPart(parts, 'label')} data-part="label">{label}</label>{/if}
	<div data-ooops-ui {...getUiPart(parts, 'control')} data-part="control">
		<button bind:this={decrement} type="button" aria-label={uiMessages.decrease} disabled={disabled} data-ooops-ui {...getUiPart(parts, 'decrement')} data-part="decrement">−</button>
		<input aria-label={ariaLabel} aria-labelledby={ariaLabelledby} aria-describedby={ariaDescribedby} bind:this={input} type="number" {id} {name} {min} {max} {step} {disabled} {required} {placeholder} value={value ?? ''} data-ooops-ui {...getUiPart(parts, 'input')} data-part="input" />
		<button bind:this={increment} type="button" aria-label={uiMessages.increase} disabled={disabled} data-ooops-ui {...getUiPart(parts, 'increment')} data-part="increment">+</button>
	</div>
</div>
