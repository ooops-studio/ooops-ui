<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createSwitchController} from '@ooopsstudio/ui-primitives'
	import {onMount, untrack, type Snippet} from 'svelte'
	type SwitchLabel = {label: string; ariaLabel?: string} | {label?: never; ariaLabel?: string; ariaLabelledby: string} | {label?: never; ariaLabel: string}
	type Props = SwitchLabel & {parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined; ariaLabelledby?: string; ariaDescribedby?: string; id?: string; name?: string; description?: string; checked?: boolean; disabled?: boolean; required?: boolean; class?: string; thumb?: Snippet<[boolean]>; onChange?: (checked: boolean) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, ariaLabel, ariaLabelledby, ariaDescribedby, description, checked = $bindable(false), disabled = false, required = false, parts, class: className = '', thumb, onChange}: Props = $props()
	const initialChecked = untrack(() => checked)
	let input: HTMLInputElement | null = $state(null)
	let controller: ReturnType<typeof createSwitchController> | null = null
	onMount(() => { controller = createSwitchController({checked, defaultChecked: initialChecked, disabled, getInput: () => input, onChange: (next) => { checked = next.checked; onChange?.(next.checked) }}); const unsubscribe = controller.subscribe(next => { checked = next.checked }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => { if (controller && controller.getState().checked !== checked) controller.setChecked(checked) })
	$effect(() => controller?.setDisabled(disabled))
</script>

<div  data-ooops-ui {...getUiPart(parts, 'root', `ooops-switch ${className}`.trim(), undefined)} data-part="root" data-state={checked ? 'on' : 'off'} data-disabled={disabled ? 'true' : 'false'}>
	<input bind:this={input} type="checkbox" bind:checked role="switch" {id} {name} {disabled} {required} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} aria-describedby={[ariaDescribedby, description && `${id}-description`].filter(Boolean).join(' ') || undefined} data-ooops-ui {...getUiPart(parts, 'control')} data-part="control" />
	<label for={id} data-ooops-ui {...getUiPart(parts, 'switch-label')} data-part="switch-label"><span aria-hidden="true" data-ooops-ui {...getUiPart(parts, 'track')} data-part="track"><span data-ooops-ui {...getUiPart(parts, 'thumb')} data-part="thumb">{#if thumb}{@render thumb(checked)}{/if}</span></span>{#if label}<span data-ooops-ui {...getUiPart(parts, 'label')} data-part="label">{label}</span>{/if}</label>
	{#if description}<span id={`${id}-description`} data-ooops-ui {...getUiPart(parts, 'description')} data-part="description">{description}</span>{/if}
</div>
