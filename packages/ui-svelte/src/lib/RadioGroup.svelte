<script lang="ts">
	import {createRadioGroupController, type ChoiceOption} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	type Props = {id?: string; name: string; label?: string; value?: string; options: ChoiceOption[]; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; required?: boolean; class?: string; option?: Snippet<[ChoiceOption, boolean]>; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, value = $bindable(''), options, orientation = 'vertical', disabled = false, required = false, class: className = '', option, onChange}: Props = $props()
	let root: HTMLElement | null = $state(null)
	let inputs: HTMLInputElement[] = $state([])
	let controller: ReturnType<typeof createRadioGroupController> | null = null
	onMount(() => {
		controller = createRadioGroupController({options, value, defaultValue: value, disabled, getRoot: () => root, getInputs: () => inputs.filter(Boolean), onChange: (next) => { value = next; onChange?.(next) }})
		controller.mount(); return () => { controller?.destroy(); controller = null }
	})
	$effect(() => controller?.setOptions(options))
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<fieldset bind:this={root} class={`ooops-radio-group ${className}`.trim()} role="radiogroup" {disabled} data-part="root" data-orientation={orientation}>
	{#if label}<legend data-part="label">{label}</legend>{/if}
	{#each options as entry, index (entry.value)}
		<label data-part="option" data-selected={entry.value === value ? 'true' : 'false'} data-disabled={entry.disabled ? 'true' : 'false'}>
			<input bind:this={inputs[index]} type="radio" {name} value={entry.value} checked={entry.value === value} disabled={disabled || entry.disabled} required={required && index === 0} data-part="control" />
			<span aria-hidden="true" data-part="indicator"></span>
			{#if option}{@render option(entry, entry.value === value)}{:else}<span>{entry.label}</span>{#if entry.description}<small data-part="description">{entry.description}</small>{/if}{/if}
		</label>
	{/each}
</fieldset>
