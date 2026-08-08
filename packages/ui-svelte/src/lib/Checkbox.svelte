<script lang="ts">
	import {createCheckboxController} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	type Props = {id?: string; name?: string; value?: string; label?: string; description?: string; checked?: boolean; indeterminate?: boolean; required?: boolean; disabled?: boolean; error?: string; class?: string; indicator?: Snippet<[boolean, boolean]>; onChange?: (checked: boolean) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, value = 'on', label, description, checked = $bindable(false), indeterminate = false, required = false, disabled = false, error, class: className = '', indicator, onChange}: Props = $props()
	let input: HTMLInputElement | null = $state(null)
	let controller: ReturnType<typeof createCheckboxController> | null = null
	onMount(() => {
		controller = createCheckboxController({checked, defaultChecked: checked, indeterminate, disabled, getInput: () => input, onChange: (next) => { checked = next.checked; onChange?.(next.checked) }})
		controller.mount()
		return () => { controller?.destroy(); controller = null }
	})
	$effect(() => { if (controller && controller.getState().checked !== checked) controller.setChecked(checked) })
	$effect(() => controller?.setIndeterminate(indeterminate))
	$effect(() => controller?.setDisabled(disabled))
</script>

<label class={`ooops-checkbox ${className}`.trim()} data-part="root" data-state={indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'} data-disabled={disabled ? 'true' : 'false'} data-invalid={error ? 'true' : 'false'}>
	<input bind:this={input} type="checkbox" {id} {name} {value} {required} {disabled} aria-describedby={description ? `${id}-description` : undefined} aria-invalid={error ? 'true' : undefined} data-part="control" />
	<span aria-hidden="true" data-part="indicator">{#if indicator}{@render indicator(checked, indeterminate)}{/if}</span>
	{#if label}<span data-part="label">{label}</span>{/if}
	{#if description}<span id={`${id}-description`} data-part="description">{description}</span>{/if}
	{#if error}<span data-part="error" aria-live="polite">{error}</span>{/if}
</label>
