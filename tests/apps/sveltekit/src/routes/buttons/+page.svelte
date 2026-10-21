<script lang="ts">
  import {Button, IconButton} from '@ooopsstudio/ui-svelte'
  import {onMount} from 'svelte'
  let showIcon = $state(true)
  let ready = $state(false), disabled = $state(true), loading = $state(true), clicks = $state(0), submits = $state(0)
  let submitted = $state(''), show = $state(true), href = $state<string | undefined>(undefined)
  let reference = $state<HTMLButtonElement | HTMLAnchorElement | null>(null)
  let iconReference = $state<HTMLButtonElement | HTMLAnchorElement | null>(null)
  onMount(() => { ready = true })
  function submit(event: SubmitEvent) {
    event.preventDefault()
    submits++
    submitted = new FormData(event.currentTarget as HTMLFormElement, event.submitter).get('action')?.toString() ?? ''
  }
</script>
<h1>Button contracts</h1><p id="ready">{ready ? 'ready' : 'server'}</p>
<form id="button-form" onsubmit={submit}>
  <label>Email<input id="email" name="email" type="email" required /></label>
  <Button id="plain" onclick={() => clicks++}>Plain action</Button>
</form>
<Button id="submit" type="submit" form="button-form" name="action" value="save">Submit record</Button>
<Button id="disabled" {disabled} onclick={() => clicks++}>Disabled action</Button>
<Button id="busy" {loading} onclick={() => clicks++}>Saving record</Button>
<Button id="passive-busy" aria-busy="true" aria-disabled="true">Background task</Button>
<Button id="blocked-link" href="/cleanup" {disabled} onclick={() => clicks++}>Blocked link</Button>
<Button id="busy-link" href="/cleanup" {loading} onclick={() => clicks++}>Busy link</Button>
{#if showIcon}<IconButton id="refresh" label="Refresh results" bind:elementRef={iconReference} onclick={() => clicks++}><span>↻</span></IconButton>{/if}
<button id="unlock" onclick={() => { disabled = false; loading = false }}>Unlock buttons</button>
{#if show}<Button id="reference" {href} bind:elementRef={reference}>Referenced action</Button>{/if}
<button id="switch-tag" onclick={() => { href = href === undefined ? '/cleanup' : undefined }}>Switch native tag</button>
<button id="remove-icon" onclick={() => { showIcon = !showIcon }}>Toggle icon reference</button>
<button id="remove" onclick={() => { show = !show }}>Toggle reference</button>
<p id="reference-state">{reference?.tagName ?? 'none'}|{iconReference?.tagName ?? 'none'}</p>
<p id="clicks">{clicks}</p><p id="submits">{submits}</p><p id="submitted">{submitted}</p>
