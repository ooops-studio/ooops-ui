<script lang="ts">
	import {createMultiSelectController, formatUiMessage, resolveUiMessages, type MultiSelectState, type SelectOption, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import {portal} from './portal'
	type Props = {id?: string; name?: string; label?: string; ariaLabel?: string; ariaLabelledby?: string; ariaDescribedby?: string; values?: string[]; options: SelectOption[]; placeholder?: string; disabled?: boolean; maxSelected?: number; showSelectAll?: boolean; showClear?: boolean; portal?: boolean; messages?: Partial<UiMessages>; class?: string; option?: Snippet<[SelectOption, boolean]>; chip?: Snippet<[SelectOption]>; onChange?: (values: readonly string[]) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, ariaLabel, ariaLabelledby, ariaDescribedby, values = $bindable([]), options, placeholder, disabled = false, maxSelected, showSelectAll = true, showClear = true, portal: usePortal = true, messages, class: className = '', option, chip, onChange}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null), input: HTMLInputElement | null = $state(null), listbox: HTMLElement | null = $state(null)
	let state: MultiSelectState = $state({open: false, query: '', values: [], options: [], activeIndex: -1, mounted: false})
	let controller: ReturnType<typeof createMultiSelectController> | null = null
	const selected = $derived(state.values.map((value) => options.find((entry) => entry.value === value)).filter((entry): entry is SelectOption => Boolean(entry)))
	onMount(() => { controller = createMultiSelectController({options, values, defaultValues: values, ...(maxSelected === undefined ? {} : {maxSelected}), disabled, getRoot: () => root, getInput: () => input, getListbox: () => listbox, getOptions: () => Array.from(listbox?.querySelectorAll<HTMLElement>('[data-option-index]') ?? []), getChips: () => Array.from(root?.querySelectorAll<HTMLElement>('[data-part="chip"]') ?? []), onChange: (next) => { values = [...next]; onChange?.(next) }}); const unsubscribe = controller.subscribe((next) => { state = next }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => controller?.setOptions(options))
	$effect(() => controller?.setDisabled(disabled))
	$effect(() => controller?.setMaxSelected(maxSelected))
	$effect(() => { if (controller && JSON.stringify(controller.getState().values) !== JSON.stringify(values)) controller.setValues(values) })
</script>

<div bind:this={root} class={`ooops-multi-select ${className}`.trim()} data-ooops-ui data-part="root" data-state={state.open ? 'open' : 'closed'} data-max-selected={maxSelected !== undefined && state.values.length >= maxSelected ? 'true' : 'false'}>
	{#if label}<label id={`${id}-label`} for={`${id}-input`} data-ooops-ui data-part="label">{label}</label>{/if}
	<div data-ooops-ui data-part="control">
		<div data-ooops-ui data-part="chips">{#each selected as entry (entry.value)}<span data-ooops-ui data-part="chip" data-value={entry.value}>{#if chip}{@render chip(entry)}{:else}{entry.label}{/if}<button type="button" {disabled} data-ooops-ui data-part="chip-remove" data-remove-value={entry.value} aria-label={formatUiMessage(uiMessages.removeItem, {label: entry.label})}>×</button></span>{/each}</div>
		<input bind:this={input} id={`${id}-input`} role="combobox" aria-controls={`${id}-listbox`} aria-expanded={state.open} aria-label={ariaLabel} aria-labelledby={ariaLabelledby ?? (label ? `${id}-label` : undefined)} aria-describedby={ariaDescribedby} placeholder={placeholder ?? uiMessages.searchOptions} {disabled} data-ooops-ui data-part="input" />
		{#if showClear}<button type="button" data-ooops-ui data-part="clear" aria-label={uiMessages.clearSelections} disabled={disabled || !state.values.length} onclick={() => controller?.clear()}>×</button>{/if}
	</div>
	{#each state.values as selectedValue}<input type="hidden" {disabled} name={name ? `${name}[]` : undefined} value={selectedValue} data-ooops-ui data-part="native-input" />{/each}
</div>

<div use:portal={usePortal} bind:this={listbox} id={`${id}-listbox`} role="listbox" aria-multiselectable="true" hidden={!state.open} data-ooops-ui data-part="listbox">
	<div data-ooops-ui data-part="actions">{#if showSelectAll}<button type="button" {disabled} data-ooops-ui data-part="select-all" onclick={() => controller?.selectAll()}>{uiMessages.selectAll}</button>{/if}{#if showClear}<button type="button" data-ooops-ui data-part="clear" onclick={() => controller?.clear()}>{uiMessages.clear}</button>{/if}</div>
	{#if state.options.length === 0}<div data-ooops-ui data-part="empty">{uiMessages.noOptions}</div>{/if}
	{#each state.options as entry, index (entry.value)}
		<div id={`${id}-option-${index}`} role="option" aria-selected={state.values.includes(entry.value)} aria-disabled={entry.disabled ? 'true' : undefined} data-option-index={index} data-ooops-ui data-part="option" data-selected={state.values.includes(entry.value) ? 'true' : 'false'} data-active={state.activeIndex === index ? 'true' : 'false'}>
			<span aria-hidden="true" data-ooops-ui data-part="indicator"></span>{#if option}{@render option(entry, state.values.includes(entry.value))}{:else}{entry.label}{/if}
		</div>
	{/each}
</div>
