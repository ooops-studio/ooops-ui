<script lang="ts">
	import {createSelectController, type SelectOption, type SelectState} from '@ooopsstudio/ui-primitives'
	import {onDestroy, onMount, type Snippet} from 'svelte'

	import {portal} from './portal'

	type Props = {
		id?: string
		name?: string
		label?: string
		description?: string
		error?: string
		value?: string
		options: SelectOption[]
		placeholder?: string
		required?: boolean
		disabled?: boolean
		allowEmpty?: boolean
		portal?: boolean
		class?: string
		trigger?: Snippet<[SelectOption | null]>
		option?: Snippet<[SelectOption, {selected: boolean; active: boolean}]>
		onChange?: (detail: {value: string; option: SelectOption | null}) => void
	}

	const generatedId = $props.id()
	let {
		id = generatedId,
		name,
		label,
		description,
		error,
		value = $bindable(''),
		options,
		placeholder = 'Select an option',
		required = false,
		disabled = false,
		allowEmpty = true,
		portal: usePortal = true,
		class: className = '',
		trigger,
		option,
		onChange
	}: Props = $props()

	let root: HTMLElement | null = $state(null)
	let triggerElement: HTMLButtonElement | null = $state(null)
	let listbox: HTMLElement | null = $state(null)
	let nativeSelect: HTMLSelectElement | null = $state(null)
	let state: SelectState = $state({open: false, value, activeIndex: -1, placement: 'bottom', mounted: false})
	let controller: ReturnType<typeof createSelectController> | null = null

	const selectedOption = $derived(options.find((entry) => entry.value === value) ?? null)
	const labelId = $derived(label ? `${id}-label` : undefined)
	const descriptionId = $derived(description ? `${id}-description` : undefined)
	const errorId = $derived(error ? `${id}-error` : undefined)
	const listboxId = $derived(`${id}-listbox`)

	onMount(() => {
		controller = createSelectController({
			options,
			value,
			defaultValue: value,
			disabled,
			allowEmpty,
			getRoot: () => root,
			getTrigger: () => triggerElement,
			getListbox: () => listbox,
			getNativeSelect: () => nativeSelect,
			onChange: (detail) => {
				value = detail.value
				onChange?.(detail)
			}
		})
		const unsubscribe = controller.subscribe((next) => {
			state = next
			if (value !== next.value) value = next.value
		})
		controller.mount()
		return () => {
			unsubscribe()
			controller?.destroy()
			controller = null
		}
	})

	$effect(() => controller?.setOptions(options))
	$effect(() => {
		if (controller && controller.getState().value !== value) controller.setValue(value)
	})

	onDestroy(() => controller?.destroy())
</script>

<div bind:this={root} class={`ooops-select ${className}`.trim()} data-part="root" data-state={state.open ? 'open' : 'closed'}>
	{#if label}<label id={labelId} for={`${id}-trigger`} data-part="label">{label}</label>{/if}
	{#if description}<span id={descriptionId} data-part="description">{description}</span>{/if}
	<button
		bind:this={triggerElement}
		id={`${id}-trigger`}
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-controls={listboxId}
		aria-expanded={state.open}
		aria-labelledby={labelId}
		aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
		aria-invalid={error ? 'true' : undefined}
		{disabled}
		data-part="trigger"
	>
		{#if trigger}
			{@render trigger(selectedOption)}
		{:else}
			<span data-part="value">{selectedOption?.label ?? placeholder}</span>
		{/if}
		<span data-part="indicator" aria-hidden="true"></span>
	</button>
	<select bind:this={nativeSelect} bind:value {name} {required} {disabled} tabindex="-1" aria-hidden="true" data-part="native-select">
		{#if allowEmpty}<option value="">{placeholder}</option>{/if}
		{#each options as entry}<option value={entry.value} disabled={entry.disabled}>{entry.label}</option>{/each}
	</select>
	{#if error}<span id={errorId} data-part="error">{error}</span>{/if}
</div>

<div
	use:portal={usePortal}
	bind:this={listbox}
	id={listboxId}
	role="listbox"
	aria-labelledby={labelId}
	class="ooops-select-listbox"
	data-part="listbox"
	hidden={!state.open}
>
	{#each options as entry, index (entry.value)}
		{#if index === 0 || entry.group !== options[index - 1]?.group}
			{#if entry.group}<div role="presentation" data-part="group-label">{entry.group}</div>{/if}
		{/if}
		<div
			id={`${id}-option-${index}`}
			role="option"
			aria-selected={entry.value === value}
			aria-disabled={entry.disabled ? 'true' : undefined}
			data-ooops-select-option
			data-option-index={index}
			data-part="option"
			data-selected={entry.value === value ? 'true' : 'false'}
			data-disabled={entry.disabled ? 'true' : 'false'}
		>
			{#if option}
				{@render option(entry, {selected: entry.value === value, active: state.activeIndex === index})}
			{:else}
				{#if entry.icon}<span data-part="option-icon" aria-hidden="true">{entry.icon}</span>{/if}
				{#if entry.iconUrl}<img data-part="option-image" src={entry.iconUrl} alt="" loading="lazy" />{/if}
				<span data-part="option-copy"><span>{entry.label}</span>{#if entry.description}<small>{entry.description}</small>{/if}</span>
			{/if}
		</div>
	{/each}
</div>
