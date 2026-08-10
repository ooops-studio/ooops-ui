<script lang="ts">
	import {createComboboxController, resolveUiMessages, type ComboboxLoadOptions, type ComboboxState, type SelectOption, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	import {portal} from './portal'
	type Props = {id?: string; name?: string; label?: string; description?: string; value?: string; options?: SelectOption[]; placeholder?: string; allowCustomValue?: boolean; disabled?: boolean; required?: boolean; clearable?: boolean; portal?: boolean; loadOptions?: ComboboxLoadOptions; debounceMs?: number; messages?: Partial<UiMessages>; class?: string; option?: Snippet<[SelectOption, {selected: boolean; active: boolean}]>; onChange?: (detail: {value: string; option: SelectOption | null; custom: boolean}) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, description, value = $bindable(''), options = [], placeholder, allowCustomValue = false, disabled = false, required = false, clearable = true, portal: usePortal = true, loadOptions, debounceMs = 150, messages, class: className = '', option, onChange}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null), input: HTMLInputElement | null = $state(null), listbox: HTMLElement | null = $state(null), nativeInput: HTMLInputElement | null = $state(null)
	let state: ComboboxState = $state({open: false, query: '', value, activeIndex: -1, options: [], loading: false, error: null, mounted: false})
	let controller: ReturnType<typeof createComboboxController> | null = null
	let appliedOptions: SelectOption[] | undefined
	onMount(() => {
		controller = createComboboxController({options, value, defaultValue: value, allowCustomValue, disabled, debounceMs, ...(loadOptions ? {loadOptions} : {}), portal: usePortal, getRoot: () => root, getInput: () => input, getListbox: () => listbox, getOptions: () => Array.from(listbox?.querySelectorAll<HTMLElement>('[data-option-index]') ?? []), getNativeInput: () => nativeInput, onChange: (detail) => { value = detail.value; onChange?.(detail) }})
		appliedOptions = options
		const unsubscribe = controller.subscribe((next) => { state = next })
		controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null }
	})
	$effect(() => {
		const nextOptions = options
		if (controller && nextOptions !== appliedOptions) {
			appliedOptions = nextOptions
			controller.setOptions(nextOptions)
		}
	})
	$effect(() => controller?.setDisabled(disabled))
	$effect(() => controller?.setAllowCustomValue(allowCustomValue))
	$effect(() => { if (controller && controller.getState().value !== value) controller.setValue(value) })
</script>

<div bind:this={root} class={`ooops-combobox ${className}`.trim()} data-part="root" data-state={state.open ? 'open' : 'closed'} data-loading={state.loading ? 'true' : 'false'}>
	{#if label}<label id={`${id}-label`} for={`${id}-input`} data-part="label">{label}</label>{/if}
	{#if description}<p id={`${id}-description`} data-part="description">{description}</p>{/if}
	<div data-part="control">
		<input bind:this={input} id={`${id}-input`} role="combobox" aria-autocomplete="list" aria-controls={`${id}-listbox`} aria-expanded={state.open} aria-labelledby={label ? `${id}-label` : undefined} aria-describedby={description ? `${id}-description` : undefined} placeholder={placeholder ?? uiMessages.searchOptions} {disabled} {required} data-part="input" />
		{#if clearable}<button type="button" aria-label={uiMessages.clearSelection} data-part="clear" disabled={disabled || !state.value} onclick={() => controller?.setValue('', true)}>×</button>{/if}
		<span aria-hidden="true" data-part="indicator"></span>
	</div>
	<input bind:this={nativeInput} type="hidden" {name} value={state.value} data-part="native-input" />
</div>

<div use:portal={usePortal} bind:this={listbox} id={`${id}-listbox`} role="listbox" aria-labelledby={label ? `${id}-label` : undefined} hidden={!state.open} data-part="listbox">
	{#if state.loading}<div role="status" data-part="loading">{uiMessages.loading}</div>{/if}
	{#if state.error}<div role="alert" data-part="error">{state.error}</div>{/if}
	{#if !state.loading && !state.error && state.options.length === 0}<div data-part="empty">{uiMessages.noOptions}</div>{/if}
	{#each state.options as entry, index (entry.value)}
		<div id={`${id}-option-${index}`} role="option" aria-selected={entry.value === state.value} aria-disabled={entry.disabled ? 'true' : undefined} data-option-index={index} data-part="option" data-selected={entry.value === state.value ? 'true' : 'false'} data-active={state.activeIndex === index ? 'true' : 'false'}>
			{#if option}{@render option(entry, {selected: entry.value === state.value, active: state.activeIndex === index})}{:else}<span data-part="option-label">{entry.label}</span>{#if entry.description}<small data-part="option-description">{entry.description}</small>{/if}{/if}
		</div>
	{/each}
</div>
