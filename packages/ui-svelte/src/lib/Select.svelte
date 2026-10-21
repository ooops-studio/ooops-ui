<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createSelectController, resolveUiMessages, type SelectOption, type SelectState, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onDestroy, onMount, type Snippet} from 'svelte'

	import {portal} from './portal'

	type Props = {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined;
		id?: string
		name?: string
		label?: string
		ariaLabel?: string
		ariaLabelledby?: string
		ariaDescribedby?: string
		description?: string
		error?: string
		value?: string
		options: SelectOption[]
		placeholder?: string
		required?: boolean
		disabled?: boolean
		allowEmpty?: boolean
		portal?: boolean
		messages?: Partial<UiMessages>
		class?: string
		trigger?: Snippet<[SelectOption | null]>
		option?: Snippet<[SelectOption, {selected: boolean; active: boolean}]>
		onChange?: (detail: {value: string; option: SelectOption | null}) => void
	}

	const generatedId = $props.id()
	let {
		id = generatedId,
		name,
		label, ariaLabel, ariaLabelledby, ariaDescribedby,
		description,
		error,
		value = $bindable(''),
		options,
		placeholder,
		required = false,
		disabled = false,
		allowEmpty = true,
		portal: usePortal = true,
		messages,
		parts, class: className = '',
		trigger,
		option,
		onChange
	}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	const resolvedPlaceholder = $derived(placeholder ?? uiMessages.selectOption)

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
	$effect(() => controller?.setDisabled(disabled))
	$effect(() => controller?.setAllowEmpty(allowEmpty))
	$effect(() => {
		if (controller && controller.getState().value !== value) controller.setValue(value)
	})

	onDestroy(() => controller?.destroy())
</script>

<div bind:this={root}  data-ooops-ui {...getUiPart(parts, 'root', `ooops-select ${className}`.trim(), undefined)} data-part="root" data-state={state.open ? 'open' : 'closed'}>
	{#if label}<label id={labelId} for={`${id}-trigger`} data-ooops-ui {...getUiPart(parts, 'label')} data-part="label">{label}</label>{/if}
	{#if description}<span id={descriptionId} data-ooops-ui {...getUiPart(parts, 'description')} data-part="description">{description}</span>{/if}
	<button
		bind:this={triggerElement}
		id={`${id}-trigger`}
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-controls={listboxId}
		aria-expanded={state.open}
		aria-label={ariaLabel} aria-labelledby={ariaLabelledby ?? labelId}
		aria-describedby={[ariaDescribedby, descriptionId, errorId].filter(Boolean).join(' ') || undefined}
		aria-invalid={error ? 'true' : undefined}
		{disabled}
		{...getUiPart(parts, 'trigger')} data-part="trigger"
	>
		{#if trigger}
			{@render trigger(selectedOption)}
		{:else}
			<span data-ooops-ui {...getUiPart(parts, 'value')} data-part="value">{selectedOption?.label ?? resolvedPlaceholder}</span>
		{/if}
		<span data-ooops-ui {...getUiPart(parts, 'indicator')} data-part="indicator" aria-hidden="true"></span>
	</button>
	<select bind:this={nativeSelect} bind:value {name} {required} {disabled} tabindex="-1" aria-hidden="true" data-ooops-ui {...getUiPart(parts, 'native-select')} data-part="native-select">
		{#if allowEmpty}<option value="">{resolvedPlaceholder}</option>{/if}
		{#each options as entry}<option value={entry.value} disabled={entry.disabled}>{entry.label}</option>{/each}
	</select>
	{#if error}<span id={errorId} data-ooops-ui {...getUiPart(parts, 'error')} data-part="error">{error}</span>{/if}
</div>

<div
	use:portal={usePortal}
	bind:this={listbox}
	id={listboxId}
	role="listbox"
	aria-label={ariaLabel} aria-labelledby={ariaLabelledby ?? labelId}

	{...getUiPart(parts, 'listbox', 'ooops-select-listbox', undefined)} data-part="listbox"
	hidden={!state.open}
>
	{#each options as entry, index (entry.value)}
		{#if index === 0 || entry.group !== options[index - 1]?.group}
			{#if entry.group}<div role="presentation" data-ooops-ui {...getUiPart(parts, 'group-label')} data-part="group-label">{entry.group}</div>{/if}
		{/if}
		<div
			id={`${id}-option-${index}`}
			role="option"
			aria-selected={entry.value === value}
			aria-disabled={entry.disabled ? 'true' : undefined}
			data-ooops-select-option
			data-option-index={index}
			{...getUiPart(parts, 'option')} data-part="option"
			data-selected={entry.value === value ? 'true' : 'false'}
			data-disabled={entry.disabled ? 'true' : 'false'}
		>
			{#if option}
				{@render option(entry, {selected: entry.value === value, active: state.activeIndex === index})}
			{:else}
				{#if entry.icon}<span data-ooops-ui {...getUiPart(parts, 'option-icon')} data-part="option-icon" aria-hidden="true">{entry.icon}</span>{/if}
				{#if entry.iconUrl}<img data-ooops-ui {...getUiPart(parts, 'option-image')} data-part="option-image" src={entry.iconUrl} alt="" loading="lazy" />{/if}
				<span data-ooops-ui {...getUiPart(parts, 'option-copy')} data-part="option-copy"><span {...getUiPart(parts, 'text')} data-ooops-ui data-part="text">{entry.label}</span>{#if entry.description}<small {...getUiPart(parts, 'small')} data-ooops-ui data-part="small">{entry.description}</small>{/if}</span>
			{/if}
		</div>
	{/each}
</div>
