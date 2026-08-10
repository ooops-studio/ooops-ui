<script lang="ts">
	import {createSliderController, resolveUiMessages, type SliderState, type SliderValue, type UiMessages} from '@ooopsstudio/ui-primitives'
	import {onMount, tick, type Snippet} from 'svelte'
	type Props = {id?: string; name?: string; label?: string; value?: SliderValue; min?: number; max?: number; step?: number; minStepsBetweenThumbs?: number; orientation?: 'horizontal' | 'vertical'; direction?: 'ltr' | 'rtl'; disabled?: boolean; messages?: Partial<UiMessages>; class?: string; thumb?: Snippet<[number, number]>; onChange?: (value: SliderValue) => void}
	const generatedId = $props.id()
	let {id = generatedId, name, label, value = $bindable(0), min = 0, max = 100, step = 1, minStepsBetweenThumbs = 0, orientation = 'horizontal', direction = 'ltr', disabled = false, messages, class: className = '', thumb, onChange}: Props = $props()
	const uiMessages = $derived(resolveUiMessages(messages))
	let root: HTMLElement | null = $state(null)
	let thumbs: HTMLDivElement[] = $state([])
	let inputs: HTMLInputElement[] = $state([])
	let state: SliderState = $state({value, activeThumb: 0, mounted: false})
	let controller: ReturnType<typeof createSliderController> | null = null
	const values = $derived(typeof state.value === 'number' ? [state.value] : [...state.value])
	onMount(() => { controller = createSliderController({value, defaultValue: value, min, max, step, minStepsBetweenThumbs, orientation, direction, disabled, getRoot: () => root, getThumbs: () => thumbs.filter(Boolean), getInputs: () => inputs.filter(Boolean), onChange: (next) => { value = next; onChange?.(next) }}); const unsubscribe = controller.subscribe((next) => { state = next }); controller.mount(); return () => { unsubscribe(); controller?.destroy(); controller = null } })
	$effect(() => { if (controller && JSON.stringify(controller.getState().value) !== JSON.stringify(value)) controller.setValue(value) })
	$effect(() => controller?.configure({min, max, step, minStepsBetweenThumbs, orientation, direction, disabled}))
	$effect(() => {
		values
		if (!controller) return
		void tick().then(() => controller?.refresh())
	})
</script>

<div class={`ooops-slider ${className}`.trim()} data-part="field-root">
	{#if label}<span id={`${id}-label`} data-part="label">{label}</span>{/if}
	<div bind:this={root} id={id} data-part="root" data-orientation={orientation} data-disabled={disabled ? 'true' : 'false'}>
		<div data-part="track"><div data-part="range"></div></div>
		{#each values as current, index}
			<div bind:this={thumbs[index]} role="slider" tabindex={disabled ? -1 : 0} aria-valuemin={min} aria-valuemax={max} aria-valuenow={current} aria-label={`${label ?? uiMessages.value} ${index + 1}`} aria-disabled={disabled ? 'true' : undefined} data-part="thumb" data-thumb={index} data-active={state.activeThumb === index ? 'true' : 'false'}>{#if thumb}{@render thumb(current, index)}{/if}</div>
			<input bind:this={inputs[index]} type="hidden" name={values.length === 1 ? name : name ? `${name}[]` : undefined} value={current} data-part="input" />
		{/each}
	</div>
</div>
