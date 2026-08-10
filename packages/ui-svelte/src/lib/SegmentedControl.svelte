<script lang="ts">
	import {createSegmentedControlController, type ChoiceOption} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	type Props = {id?: string; name?: string; label?: string; value?: string; options: ChoiceOption[]; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; class?: string; option?: Snippet<[ChoiceOption, boolean]>; onChange?: (value: string) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, value = $bindable(''), options, orientation = 'horizontal', disabled = false, class: className = '', option, onChange}: Props = $props()
	let root: HTMLElement | null = $state(null)
	let buttons: HTMLButtonElement[] = $state([])
	let controller: ReturnType<typeof createSegmentedControlController> | null = null
	onMount(() => { controller = createSegmentedControlController({options, value, defaultValue: value, disabled, getRoot: () => root, getInputs: () => buttons.filter(Boolean), onChange: (next) => { value = next; onChange?.(next) }}); controller.mount(); return () => { controller?.destroy(); controller = null } })
	$effect(() => controller?.setOptions(options))
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<div bind:this={root} id={id} class={`ooops-segmented ${className}`.trim()} role="radiogroup" aria-label={label} data-part="root" data-orientation={orientation}>
	{#each options as entry, index (entry.value)}
		<button bind:this={buttons[index]} type="button" role="radio" value={entry.value} aria-checked={entry.value === value} disabled={disabled || entry.disabled} data-part="option" data-selected={entry.value === value ? 'true' : 'false'}>{#if option}{@render option(entry, entry.value === value)}{:else}{entry.label}{/if}</button>
	{/each}
	{#if name}<input type="hidden" {name} {value} data-part="input" />{/if}
</div>
