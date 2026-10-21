<script lang="ts">
	import type {ComponentProps} from 'svelte'
	import Modal from './Modal.svelte'

	type Props = ComponentProps<typeof Modal> & {side?: 'start' | 'end' | 'top' | 'bottom'}
	let {side = 'end', open = $bindable(false), class: className = '', ...props}: Props = $props()
</script>

<Modal {...props} bind:open class={`ooops-drawer-root ooops-drawer-${side} ${className}`.trim()} />
