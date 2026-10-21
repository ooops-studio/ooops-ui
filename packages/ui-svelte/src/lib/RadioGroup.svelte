<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createRadioGroupController, type ChoiceOption} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; id?: string; name?: string; label?: string; ariaLabel?: string; ariaLabelledby?: string; ariaDescribedby?: string; value?: string; options: ChoiceOption[]; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; required?: boolean; class?: string; option?: Snippet<[ChoiceOption, boolean]>; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, ariaLabel, ariaLabelledby, ariaDescribedby, value = $bindable(''), options, orientation = 'vertical', disabled = false, required = false, parts, class: className = '', option, onChange}: Props = $props()
	let root: HTMLElement | null = $state(null)
	let inputs: HTMLInputElement[] = $state([])
	let controller: ReturnType<typeof createRadioGroupController> | null = null
	onMount(() => {
		controller = createRadioGroupController({options, value, defaultValue: value, disabled, getRoot: () => root, getInputs: () => inputs.filter(Boolean), onChange: (next) => { value = next; onChange?.(next) }})
		const unsubscribe = controller.subscribe(next => { value = next.value }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null }
	})
	$effect(() => controller?.setOptions(options))
	$effect(() => controller?.setDisabled(disabled))
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<fieldset {id} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} aria-describedby={ariaDescribedby} bind:this={root}  role="radiogroup" {disabled} data-ooops-ui {...getUiPart(parts, 'root', `ooops-radio-group ${className}`.trim(), undefined)} data-part="root" data-orientation={orientation}>
	{#if label}<legend data-ooops-ui {...getUiPart(parts, 'label')} data-part="label">{label}</legend>{/if}
	{#each options as entry, index (entry.value)}
		<label data-ooops-ui {...getUiPart(parts, 'option')} data-part="option" data-selected={entry.value === value ? 'true' : 'false'} data-disabled={entry.disabled ? 'true' : 'false'}>
			<input bind:this={inputs[index]} type="radio" {name} value={entry.value} checked={entry.value === value} disabled={disabled || entry.disabled} required={required && index === 0} data-ooops-ui {...getUiPart(parts, 'control')} data-part="control" />
			<span aria-hidden="true" data-ooops-ui {...getUiPart(parts, 'indicator')} data-part="indicator"></span>
			{#if option}{@render option(entry, entry.value === value)}{:else}<span {...getUiPart(parts, 'text')} data-ooops-ui data-part="text">{entry.label}</span>{#if entry.description}<small data-ooops-ui {...getUiPart(parts, 'description')} data-part="description">{entry.description}</small>{/if}{/if}
		</label>
	{/each}
</fieldset>
