<script lang="ts">
 import {Input, Textarea, Field, MultiSelect, RadioGroup, NumberInput, Popover, DropdownMenu, Modal, Dialog, Tabs} from '@ooopsstudio/ui-svelte'
 import {onMount} from 'svelte'
 let showEmail = $state(true)
 let ready = $state(false), ref = $state<HTMLInputElement | null>(null)
 let popAnchor = $state<HTMLButtonElement | null>(null), menuAnchor = $state<HTMLButtonElement | null>(null), portalTarget = $state<HTMLDivElement | null>(null)
 let blurCount = $state(0), keyCount = $state(0), inputCount = $state(0), valueCount = $state(0)
 let disabled = $state(true), tags = $state(['a']), allowClose = $state(false), modalOpen = $state(false), dialogOpen = $state(false), active = $state('one')
 let confirmCount = $state(0), errors = $state(0), menuSelection = $state('')
 onMount(() => { ready = true })
 const items = [{id: 'checked', label: 'Checked option', type: 'checkbox' as const, keepOpen: true}, {id: 'parent', label: 'Level one', children: [{id: 'child', label: 'Level two', children: [{id: 'leaf', label: 'Deep action'}]}]}]
</script>
<h1>Consumer contracts</h1><p id="ready">{ready ? 'ready' : 'server'}</p>
<form id="native-form"></form><p id="outside-help">External help</p>
{#if showEmail}<Field id="email-field" label="Contact email" description="Field description" error="Invalid email" required>
 {#snippet children(control)}
  <Input {...control} bind:elementRef={ref} name="email" type="email" form="native-form" maxlength={30} pattern=".+@.+" inputmode="email" aria-describedby={`outside-help ${control['aria-describedby']}`} onblur={() => blurCount++} onkeydown={() => keyCount++} oninput={() => inputCount++} onChange={() => valueCount++} />
 {/snippet}
</Field>{/if}<button onclick={() => { showEmail = !showEmail }}>Toggle email field</button><p id="reference-state">{ref ? ref.id : 'none'}</p>
<button onclick={() => ref?.focus()}>Focus email</button><p id="event-counts">{blurCount}|{keyCount}|{inputCount}|{valueCount}</p>
<Textarea id="notes" ariaLabel="Private notes" aria-describedby="outside-help" minlength={2} maxlength={40} />
<RadioGroup ariaLabel="Theme" options={[{value: 'light', label: 'Light'}, {value: 'dark', label: 'Dark'}]} />
<NumberInput id="amount" ariaLabel="Amount" min={0} max={10} value={20} />
<MultiSelect label="Protected tags" options={[{value: 'a', label: 'Alpha'}]} bind:values={tags} {disabled} showClear={false} showSelectAll={false} />
<button onclick={() => { disabled = !disabled }}>Toggle tags disabled</button><p id="tags-state">{JSON.stringify(tags)}</p>
<div id="foreign-content" data-part="content">Foreign content</div><div id="foreign-track" data-part="track">Foreign track</div>
<div bind:this={portalTarget} id="custom-portal"></div>
<button bind:this={popAnchor}>External popover</button>
<Popover id="external-pop" anchorEl={popAnchor} {portalTarget} matchAnchorWidth ariaLabel="Contract popover" beforeClose={() => allowClose}>
 <p>External popover content</p>
</Popover>
<button bind:this={menuAnchor}>External menu</button>
<DropdownMenu id="external-menu" anchorEl={menuAnchor} {portalTarget} matchAnchorWidth items={items} onSelect={item => { menuSelection = `${item.id}:${String(item.checked)}` }} />
<p id="menu-selection">{menuSelection}</p>
<button onclick={() => { allowClose = !allowClose }}>Toggle close permission</button>
<button id="modal-trigger" onclick={() => { modalOpen = true }}>Open guarded modal</button>
<Modal title="Guarded modal" bind:open={modalOpen} beforeClose={() => allowClose} initialFocus={() => document.getElementById('modal-input')} restoreFocusTo={() => document.getElementById('modal-trigger')}>
 <button onclick={() => { modalOpen = false }}>Attempt controlled close</button><input id="modal-input" aria-label="Modal input" /><button onclick={() => { allowClose = true }}>Allow modal close</button>
</Modal>
<button onclick={() => { dialogOpen = true }}>Open confirmation</button>
<Dialog title="Save changes" bind:open={dialogOpen} onConfirm={async() => { confirmCount++; await new Promise(resolve => setTimeout(resolve, 150)); throw new Error('Save failed') }} onConfirmError={() => { errors++ }} />
<p id="save-state">{confirmCount}|{errors}</p>
<Tabs id="external-tabs" items={[{id: 'one', label: 'First tab', panelId: 'external-one', badge: 2}, {id: 'two', label: 'Second tab', panelId: 'external-two'}]} renderPanels={false} bind:activeId={active} />
<div id="external-one" role="tabpanel" aria-labelledby="external-tabs-tab-one" data-value="one">First external panel</div>
<div id="external-two" role="tabpanel" aria-labelledby="external-tabs-tab-two" data-value="two">Second external panel</div>
<Tabs id="navigation-buttons" mode="navigation" items={[{id: 'one', label: 'Button one'}, {id: 'two', label: 'Button two'}]} />
