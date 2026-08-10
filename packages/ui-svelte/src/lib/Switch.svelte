<script lang="ts">
	import {createSwitchController} from '@ooopsstudio/ui-primitives'
	import {onMount, type Snippet} from 'svelte'
	type SwitchLabel = {label: string; ariaLabel?: string} | {label?: never; ariaLabel: string}
	type Props = SwitchLabel & {id?: string; name?: string; description?: string; checked?: boolean; disabled?: boolean; required?: boolean; class?: string; thumb?: Snippet<[boolean]>; onChange?: (checked: boolean) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, ariaLabel, description, checked = $bindable(false), disabled = false, required = false, class: className = '', thumb, onChange}: Props = $props()
	let input: HTMLInputElement | null = $state(null)
	let controller: ReturnType<typeof createSwitchController> | null = null
	onMount(() => { controller = createSwitchController({checked, defaultChecked: checked, disabled, getInput: () => input, onChange: (next) => { checked = next.checked; onChange?.(next.checked) }}); controller.mount(); return () => { controller?.destroy(); controller = null } })
	$effect(() => { if (controller && controller.getState().checked !== checked) controller.setChecked(checked) })
	$effect(() => controller?.setDisabled(disabled))
</script>

<div class={`ooops-switch ${className}`.trim()} data-part="root" data-state={checked ? 'on' : 'off'} data-disabled={disabled ? 'true' : 'false'}>
	<input bind:this={input} type="checkbox" {id} {name} {disabled} {required} aria-label={!label ? ariaLabel : undefined} aria-describedby={description ? `${id}-description` : undefined} data-part="control" />
	<label for={id} data-part="switch-label"><span aria-hidden="true" data-part="track"><span data-part="thumb">{#if thumb}{@render thumb(checked)}{/if}</span></span>{#if label}<span data-part="label">{label}</span>{/if}</label>
	{#if description}<span id={`${id}-description`} data-part="description">{description}</span>{/if}
</div>
