<script lang="ts">
	import {createCheckboxController} from '@ooopsstudio/ui-primitives'
	import {onMount, untrack, type Snippet} from 'svelte'
	type Props = {id?: string; name?: string; value?: string; label?: string; ariaLabel?: string; ariaLabelledby?: string; ariaDescribedby?: string; description?: string; checked?: boolean; indeterminate?: boolean; required?: boolean; disabled?: boolean; error?: string; class?: string; indicator?: Snippet<[boolean, boolean]>; onChange?: (checked: boolean) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, value = 'on', label, ariaLabel, ariaLabelledby, ariaDescribedby, description, checked = $bindable(false), indeterminate = false, required = false, disabled = false, error, class: className = '', indicator, onChange}: Props = $props()
	const initialChecked = untrack(() => checked)
	let input: HTMLInputElement | null = $state(null)
	let controller: ReturnType<typeof createCheckboxController> | null = null
	onMount(() => {
		controller = createCheckboxController({checked, defaultChecked: initialChecked, indeterminate, disabled, getInput: () => input, onChange: (next) => { checked = next.checked; onChange?.(next.checked) }})
		const unsubscribe = controller.subscribe(next => { checked = next.checked })
		controller.mount()
		return () => { unsubscribe(); controller?.destroy(); controller = null }
	})
	$effect(() => { if (controller && controller.getState().checked !== checked) controller.setChecked(checked) })
	$effect(() => controller?.setIndeterminate(indeterminate))
	$effect(() => controller?.setDisabled(disabled))
</script>

<label class={`ooops-checkbox ${className}`.trim()} data-ooops-ui data-part="root" data-state={indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'} data-disabled={disabled ? 'true' : 'false'} data-invalid={error ? 'true' : 'false'}>
	<input aria-label={ariaLabel} aria-labelledby={ariaLabelledby} bind:this={input} type="checkbox" bind:checked {id} {name} {value} {required} {disabled} aria-describedby={[ariaDescribedby, description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} aria-invalid={error ? 'true' : undefined} data-ooops-ui data-part="control" />
	<span aria-hidden="true" data-ooops-ui data-part="indicator">{#if indicator}{@render indicator(checked, indeterminate)}{/if}</span>
	{#if label}<span data-ooops-ui data-part="label">{label}</span>{/if}
	{#if description}<span id={`${id}-description`} data-ooops-ui data-part="description">{description}</span>{/if}
	{#if error}<span id={`${id}-error`} data-ooops-ui data-part="error" aria-live="polite">{error}</span>{/if}
</label>
