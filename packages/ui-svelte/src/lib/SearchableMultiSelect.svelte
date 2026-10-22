<script lang="ts">
	import {createSearchableMultiSelectController, getUiPart, type SearchableMultiSelectController, type SearchableMultiSelectOptions, type SearchableMultiSelectState, type UiParts, type SelectOption} from '@ooopsstudio/ui-primitives'
	import {onDestroy, untrack, type Snippet} from 'svelte'
	type Props = {
		options: SelectOption[]; values?: string[]; disabled?: boolean; hideSelected?: boolean; restoreFocusOnRemove?: boolean; clearQueryOnEscape?: boolean; persistentQueryResults?: boolean; limit?: number
		filter?: SearchableMultiSelectOptions['filter']; onChange?: SearchableMultiSelectOptions['onChange']
		onAdd?: (value: string) => void; onRemove?: (value: string) => void; onCreate?: (query: string) => void
		root?: HTMLElement | null; input?: HTMLInputElement | null; listbox?: HTMLElement | null
		id?: string; name?: string; ariaLabel?: string; placeholder?: string; emptyLabel?: string; createLabel?: string
		parts?: UiParts; class?: string
		children?: Snippet<[SearchableMultiSelectState, SearchableMultiSelectController]>
		option?: Snippet<[SelectOption, boolean]>
	}
	const generatedId = $props.id()
	let {options, values = $bindable([]), disabled = false, hideSelected = false, restoreFocusOnRemove = true, clearQueryOnEscape = false, persistentQueryResults = false, limit, filter, onChange, onAdd, onRemove, onCreate,
		root = $bindable(null), input = $bindable(null), listbox = $bindable(null), id = generatedId, name, ariaLabel = 'Choose options', placeholder = 'Search', emptyLabel = 'No matching options', createLabel = 'Create', parts, class: className = '', children, option}: Props = $props()
	const initialValues = untrack(() => [...values])
	let state: SearchableMultiSelectState = $state(untrack(() => ({query: '', open: false, values: [...values], options})))
	const controller = untrack(() => createSearchableMultiSelectController({options, values, disabled, hideSelected, restoreFocusOnRemove, clearQueryOnEscape, persistentQueryResults, ...(limit === undefined ? {} : {limit}),
		filter: (entry, query) => filter ? filter(entry, query) : entry.label.toLocaleLowerCase().includes(query),
		getRoot: () => root, getInput: () => input, getOptions: () => Array.from(listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
		onChange: next => { values = [...next]; onChange?.(next) }, onAdd: value => onAdd?.(value), onRemove: value => onRemove?.(value),
		onCreate: query => onCreate?.(query)
	}))
	export const clearQuery = () => controller.clearQuery()
	const unsubscribe = controller.subscribe(next => { state = next })
	onDestroy(() => { unsubscribe(); controller.destroy() })
	$effect(() => {
		const next = {options: options.map(entry => ({...entry})), values: [...values], disabled, hideSelected, restoreFocusOnRemove, clearQueryOnEscape, persistentQueryResults, filter, ...(limit === undefined ? {} : {limit})}
		untrack(() => controller.configure(next))
	})
	$effect(() => {
		const form = input?.form
		if (!form) return
		let active = true
		const reset = (event: Event) => queueMicrotask(() => {
			if (!active || event.defaultPrevented) return
			values = [...initialValues]
			controller.setValues(values); controller.clearQuery(); controller.close()
		})
		form.addEventListener('reset', reset)
		return () => { active = false; form.removeEventListener('reset', reset) }
	})

	$effect(() => {
		if (!input) return
		input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list')
		input.setAttribute('aria-expanded', String(state.open)); input.setAttribute('aria-controls', `${id}-listbox`)
		if (listbox) { listbox.id = `${id}-listbox`; listbox.setAttribute('aria-multiselectable', 'true') }
	})
</script>

{#if children}
	{@render children(state, controller)}
{:else}
	<div bind:this={root} {...getUiPart(parts, 'root', className)} data-ooops-ui data-part="root" data-state={state.open ? 'open' : 'closed'} onfocusout={() => controller.onFocusOut()}>
		<input bind:this={input} aria-label={ariaLabel} {placeholder} {disabled} value={state.query} oninput={event => controller.setQuery(event.currentTarget.value)} onfocus={() => controller.open()} onkeydown={controller.onInputKeydown} {...getUiPart(parts, 'input')} data-ooops-ui data-part="input" />
		{#if state.open}
			<div {...getUiPart(parts, 'menu')} data-ooops-ui data-part="menu">
				<div bind:this={listbox} role="listbox" aria-label={ariaLabel} tabindex="-1" onkeydown={controller.onListKeydown} {...getUiPart(parts, 'listbox')} data-ooops-ui data-part="listbox">
					{#each state.options as entry (entry.value)}
						<button type="button" role="option" aria-selected={state.values.includes(entry.value)} disabled={entry.disabled} onclick={() => controller.toggle(entry.value)} {...getUiPart(parts, 'option')} data-ooops-ui data-part="option" data-selected={state.values.includes(entry.value)}>{#if option}{@render option(entry, state.values.includes(entry.value))}{:else}{entry.label}{/if}</button>
					{/each}
				</div>
				{#if !state.options.length}<p {...getUiPart(parts, 'empty')} data-ooops-ui data-part="empty">{emptyLabel}</p>{/if}
				{#if onCreate}<button type="button" onclick={() => controller.create()} {...getUiPart(parts, 'create')} data-ooops-ui data-part="create">{createLabel}</button>{/if}
			</div>
		{/if}
		<div {...getUiPart(parts, 'chips')} data-ooops-ui data-part="chips">
			{#each state.values as value (value)}
				<button type="button" {disabled} aria-label={`Remove ${options.find(entry => entry.value === value)?.label ?? value}`} onclick={() => controller.remove(value)} {...getUiPart(parts, 'chip')} data-ooops-ui data-part="chip">{options.find(entry => entry.value === value)?.label ?? value} ×</button>
			{/each}
		</div>
		{#each state.values as value (value)}<input type="hidden" {name} {value} {disabled} {...getUiPart(parts, 'native-input')} data-ooops-ui data-part="native-input" />{/each}
	</div>
{/if}
