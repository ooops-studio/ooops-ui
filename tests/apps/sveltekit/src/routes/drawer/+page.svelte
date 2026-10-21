<script lang="ts">
	import {Drawer} from '@ooopsstudio/ui-svelte'
	import {onMount} from 'svelte'
	let allow = $state(false), open = $state(false), busy = $state(true), show = $state(true)
	onMount(() => { document.documentElement.dataset.drawerReady = 'true'; return () => { delete document.documentElement.dataset.drawerReady } })
</script>
<h1>Drawer contracts</h1>
{#if show}
<Drawer title="Edit details" bind:open initialFocus={() => document.getElementById('drawer-name')} beforeClose={() => allow}>
	{#snippet trigger()}Edit details{/snippet}
	<label>Name <input id="drawer-name" name="name" /></label>
	<button onclick={() => { allow = true }}>Allow dismissal</button>
	<button onclick={() => { open = false }}>Attempt controlled close</button>
	<button onclick={() => { show = false }}>Unmount drawer</button>
	{#each Array.from({length: 40}, (_, i) => i + 1) as row}<p>Body row {row}</p>{/each}
	{#snippet footer()}<p>Persistent footer</p>{/snippet}
</Drawer>
{/if}
<Drawer title="Start panel" side="start">
	{#snippet trigger()}Open start{/snippet}<p>Start content</p>
</Drawer>
<Drawer title="Bottom panel" side="bottom">
	{#snippet trigger()}Open bottom{/snippet}<p>Bottom content</p>
</Drawer>
<Drawer title="Saving details" {busy}>
	{#snippet trigger()}Open busy{/snippet}<p>Saving in progress</p><button onclick={() => { busy = false }}>Finish saving</button>
</Drawer>
<a href="/cleanup">Leave drawers</a>
