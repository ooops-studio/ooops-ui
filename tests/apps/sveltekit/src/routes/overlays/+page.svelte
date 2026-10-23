<script lang="ts">
  import {Dialog, Modal, Popover, DropdownMenu, Tooltip} from '@ooopsstudio/ui-svelte'
  import {createNonModalFocusController} from '@ooopsstudio/ui-primitives'
  import {onMount} from 'svelte'
  let modalOpen = $state(false), drawerOpen = $state(false), calls = $state(0), message = $state(''), action = $state('')
  let resolvePending = () => {}, rejectPending = (_error: Error) => {}, decline = false
  const items = [{id:'more',label:'More',children:[{id:'disabled',label:'Unavailable',disabled:true},{id:'first',label:'First child'},{id:'last',label:'Last child'}]},{id:'other',label:'Other action'}]
  const confirm = async() => {
    if (decline) { decline=false; message='Review your changes'; return false }
    calls++; message = ''
    await new Promise<void>((resolve,reject) => { resolvePending = resolve; rejectPending = reject })
  }
  function nonModal(node: HTMLElement, open: boolean) {
    const owner = createNonModalFocusController({getContainer:()=>node,onEscape:()=>{drawerOpen=false}})
    node.addEventListener('keydown',owner.handleKeydown); owner.setOpen(open)
    return {update(next:boolean){owner.setOpen(next)},destroy(){node.removeEventListener('keydown',owner.handleKeydown);owner.destroy()}}
  }
  onMount(()=>{document.documentElement.dataset.overlayReady='true'})
</script>
<h1>Overlay contracts</h1>
{#snippet trigger()}Open overlay workspace{/snippet}
{#snippet help()}<button type="button">Context help</button>{/snippet}
<Modal title="Overlay workspace" bind:open={modalOpen} {trigger}>
  <label>Modal text <input aria-label="Modal text" /></label>
  <Popover id="native-popover" triggerLabel="Nested details" ariaLabel="Nested details" focusOnOpen>
    <button type="button" onclick={()=>{action='popover'}}>Nested action</button>
  </Popover>
  <DropdownMenu id="native-menu" triggerLabel="Nested actions" ariaLabel="Nested actions" {items} onSelect={item=>{action=item.id}} />
  <Tooltip id="native-help" content="Contextual instructions" openDelayMs={0} closeDelayMs={80} children={help} />
</Modal>
<output aria-label="Action">{action}</output>
<button type="button" onclick={()=>{drawerOpen=true}}>Open non-modal drawer</button>
<aside use:nonModal={drawerOpen} hidden={!drawerOpen} role="region" aria-label="Non-modal drawer">
  <h2>Non-modal drawer</h2><input aria-label="Drawer note" />
  <button type="button" onclick={()=>{drawerOpen=false}}>Close drawer</button>
</aside>
<button type="button">After drawer</button>
{#snippet confirmTrigger()}Open confirmation{/snippet}
<Dialog title="Save changes" trigger={confirmTrigger} onConfirm={confirm} onConfirmError={error=>{message=error instanceof Error?error.message:'Request failed'}}>
  {#if message}<p role="alert">{message}</p>{/if}
  <button type="button" onclick={()=>{decline=true}}>Decline next confirmation</button>
  <button type="button" onclick={()=>resolvePending()}>Resolve request</button>
  <button type="button" onclick={()=>rejectPending(new Error('Request failed'))}>Reject request</button>
</Dialog>
<output aria-label="Requests">{calls}</output>
