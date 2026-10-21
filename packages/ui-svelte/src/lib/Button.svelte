<script lang="ts">
	import {getUiPart} from '@ooopsstudio/ui-primitives'
	import {createButtonController, getButtonAttributes} from '@ooopsstudio/ui-primitives'

	import type {ButtonProps} from './button-types.js'

	let {parts, href, disabled = false, loading = false, type = 'button', ariaLabel,
		elementRef = $bindable(null), children, loadingIndicator, ...native}: ButtonProps = $props()
	let controller = $state.raw<ReturnType<typeof createButtonController> | null>(null)
	const attributes = $derived(getButtonAttributes({href, disabled, loading, type, tabindex: native.tabindex,
		ariaBusy: native['aria-busy'], ariaDisabled: native['aria-disabled']}))
	function connect(element: HTMLButtonElement | HTMLAnchorElement) {
		const control = createButtonController({getElement: () => element, href, disabled, loading,
			type, tabindex: native.tabindex, role: native.role,
			ariaBusy: native['aria-busy'], ariaDisabled: native['aria-disabled']})
		control.mount()
		controller = control
		elementRef = element
		return {destroy() {
			control.destroy()
			if (controller === control) controller = null
			if (elementRef === element) elementRef = null
		}}
	}
	$effect(() => controller?.configure({href, disabled, loading, type,
		tabindex: native.tabindex, role: native.role,
		ariaBusy: native['aria-busy'], ariaDisabled: native['aria-disabled']}))
</script>

{#snippet content()}
	{#if loading && loadingIndicator}<span data-ooops-ui {...getUiPart(parts, 'loading-indicator')} data-part="loading-indicator" aria-hidden="true">{@render loadingIndicator()}</span>{/if}
	{#if children}{@render children()}{/if}
{/snippet}

{#if href != null}
	<a use:connect {...native} {...attributes} role={native.role ?? attributes.role}
		aria-label={ariaLabel ?? native['aria-label']} data-ooops-ui {...getUiPart(parts, 'button', native.class, typeof native.style === 'string' ? native.style : undefined)} data-part="button">{@render content()}</a>
{:else}
	<button use:connect {...native} {...attributes} role={native.role}
		aria-label={ariaLabel ?? native['aria-label']} data-ooops-ui {...getUiPart(parts, 'button', native.class, typeof native.style === 'string' ? native.style : undefined)} data-part="button">{@render content()}</button>
{/if}
