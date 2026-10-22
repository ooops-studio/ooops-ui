<script lang="ts">
  import {
    Accordion,
    Checkbox,
    Combobox,
    Dialog,
    DropdownMenu,
    Field,
    Input,
    Modal,
    MultiSelect,
    NumberInput,
    Part,
    Popover,
    RadioGroup,
    SegmentedControl,
    Select,
    Slider,
    Switch,
    Tabs,
    Textarea,
    Tooltip,
    type ChoiceOption,
    type ComboboxLoadOptions,
    type SelectOption,
    type SliderValue
  } from '@ooopsstudio/ui-svelte'
  import {onDestroy, onMount} from 'svelte'

  const countries: SelectOption[] = [
    {value: 'gr', label: 'Greece', description: 'Athens', group: 'Europe'},
    {value: 'it', label: 'Italy', description: 'Rome', group: 'Europe'},
    {value: 'jp', label: 'Japan', description: 'Tokyo', group: 'Asia'},
    {value: 'disabled', label: 'Disabled', disabled: true}
  ]
  const tagOptions: SelectOption[] = [
    {value: 'design', label: 'Design'},
    {value: 'code', label: 'Code'},
    {value: 'research', label: 'Research'}
  ]
  const choices = [
    {value: 'basic', label: 'Basic', description: 'Basic plan'},
    {value: 'pro', label: 'Pro', description: 'Professional plan'},
    {value: 'disabled', label: 'Disabled', disabled: true}
  ]

  let hydrated = $state(false)
  let mountCount = $state(0)
  let name = $state('Ada')
  let biography = $state('Hello')
  let terms = $state(false)
  let mixed = $state(true)
  let disabledCheck = $state(true)
  let plan = $state('basic')
  let notifications = $state(false)
  let view = $state('grid')
	let dynamicChoices = $state<ChoiceOption[]>([...choices])
	let dynamicViews = $state<ChoiceOption[]>([{value: 'grid', label: 'Grid'}, {value: 'list', label: 'List'}])
  let selectValue = $state('')
  let comboValue = $state('')
  let asyncComboValue = $state('')
  let tags = $state<string[]>([])
  let menuOpen = $state(false)
  let menuSelections = $state(0)
  let dialogOpen = $state(false)
  let nestedModalOpen = $state(false)
  let modalOpen = $state(false)
  let popoverOpen = $state(false)
  let activeTab = $state('overview')
  let openAccordion = $state<string[]>([])
  let quantity = $state<number | null>(2)
  let price = $state<[number, number]>([20, 80])
	let shapeValue = $state<SliderValue>(40)
  let externalError = $state('')
  let dynamicOptions = $state<SelectOption[]>(countries)
  let formOutput = $state('')
	let reactiveDisabled = $state(true)
	let removableOptions = $state<SelectOption[]>([{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}])
	let removableChoice = $state('b')
	let removableCombo = $state('b')
	let removableMulti = $state<string[]>(['a', 'b'])
	let removableTabs = $state([{id: 'first', label: 'First', content: 'First'}, {id: 'second', label: 'Second', content: 'Second'}])
	let removableActiveTab = $state('second')
	let reactiveSlider = $state<SliderValue>(20)

  const loadOptions: ComboboxLoadOptions = async(query, {signal}) => {
    const delay = query.toLowerCase().includes('navigate') ? 1_000 : query.toLowerCase().includes('slow') ? 120 : 20
    const pending = Number(sessionStorage.getItem('svelte-async-pending') ?? 0) + 1
    sessionStorage.setItem('svelte-async-pending', String(pending))
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, delay)
        signal.addEventListener('abort', () => {
          window.clearTimeout(timer)
          const aborted = Number(sessionStorage.getItem('svelte-async-aborted') ?? 0) + 1
          sessionStorage.setItem('svelte-async-aborted', String(aborted))
          reject(new DOMException('Aborted', 'AbortError'))
        }, {once: true})
      })
      if (query.toLowerCase().includes('error')) throw new Error('Async options failed')
      return countries.filter((entry) => entry.label.toLowerCase().includes(query.toLowerCase()))
    } finally {
      const remaining = Math.max(0, Number(sessionStorage.getItem('svelte-async-pending') ?? 1) - 1)
      sessionStorage.setItem('svelte-async-pending', String(remaining))
    }
  }

  const submitForm = (event: SubmitEvent) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    formOutput = [...new FormData(form).entries()].map(([key, value]) => `${key}=${String(value)}`).join('&')
  }

  onMount(() => {
    hydrated = true
    mountCount = Number(sessionStorage.getItem('svelte-lab-mounts') ?? 0) + 1
    sessionStorage.setItem('svelte-lab-mounts', String(mountCount))
  })

  onDestroy(() => {
    if (typeof sessionStorage === 'undefined') return
    const cleanups = Number(sessionStorage.getItem('svelte-lab-cleanups') ?? 0) + 1
    sessionStorage.setItem('svelte-lab-cleanups', String(cleanups))
  })

</script>

{#snippet prefix()}<span data-testid="svelte-prefix">@</span>{/snippet}
{#snippet suffix()}<span data-testid="svelte-suffix">.dev</span>{/snippet}
{#snippet fieldChild()}<input id="svelte-field-control-control" name="standalone" required />{/snippet}
{#snippet selectTrigger(selected: SelectOption | null)}<strong data-testid="select-trigger-snippet">{selected?.label ?? 'Choose'}</strong>{/snippet}
{#snippet selectOption(option: SelectOption, state: {selected: boolean; active: boolean})}<span data-testid="select-option-snippet" data-selected={state.selected}>{option.label}</span>{/snippet}
{#snippet comboOption(option: SelectOption, state: {selected: boolean; active: boolean})}<span data-testid="combo-option-snippet" data-active={state.active}>{option.label}</span>{/snippet}
{#snippet chip(option: SelectOption)}<strong data-testid="multi-chip-snippet">{option.label}</strong>{/snippet}
{#snippet menuTrigger()}<span data-testid="menu-trigger-snippet">Svelte actions</span>{/snippet}
{#snippet dialogTrigger()}<span data-testid="dialog-trigger-snippet">Open dialog</span>{/snippet}
{#snippet dialogBody()}<p>Dialog body</p>{/snippet}
{#snippet nestedDialogBody()}<p>Dialog body</p><Modal id="svelte-nested-modal" title="Nested modal" bind:open={nestedModalOpen} trigger={nestedModalTrigger} children={nestedModalBody} />{/snippet}
{#snippet nestedModalTrigger()}<span>Open nested modal</span>{/snippet}
{#snippet nestedModalBody()}<button type="button" id="svelte-nested-action">Nested action</button>{/snippet}
{#snippet modalTrigger()}<span>Open modal</span>{/snippet}
{#snippet modalBody()}<button type="button" id="svelte-modal-action">Modal action</button>{/snippet}
{#snippet popoverTrigger(open: boolean)}<span>Popover {open ? 'open' : 'closed'}</span>{/snippet}
{#snippet popoverBody()}<button type="button" id="svelte-popover-action">Popover action</button>{/snippet}
{#snippet tooltipChild()}<button type="button" id="svelte-tooltip-trigger">Svelte help</button>{/snippet}
{#snippet delayedTooltipChild()}<button type="button" id="svelte-tooltip-delayed-trigger">Delayed help</button>{/snippet}
{#snippet tabSnippet(item: {id: string; label: string}, active: boolean)}<span data-testid="tab-snippet" data-active={active}>{item.label}</span>{/snippet}
{#snippet panelSnippet(item: {id: string; content?: string})}<p data-testid="panel-snippet">{item.content}</p>{/snippet}
{#snippet accordionTrigger(item: {id: string; title?: string; label?: string}, open: boolean)}<span data-testid="accordion-trigger-snippet" data-open={open}>{item.title ?? item.label}</span>{/snippet}
{#snippet accordionPanel(item: {id: string; content?: string})}<p>{item.content}</p>{/snippet}
{#snippet thumb(value: number, index: number)}<span data-testid="slider-thumb-snippet">{index}:{value}</span>{/snippet}
{#snippet partChild()}Custom part{/snippet}

<h1>Svelte component laboratory</h1>
<p id="hydration-status" data-hydrated={hydrated}>{hydrated ? 'hydrated' : 'server-rendered'}</p>
<p id="mount-count">mounts:{mountCount}</p>
<p><a href="/cleanup" id="cleanup-link">Test cleanup</a></p>

<div class="lab-section" data-lab="reactivity">
  <h2>External state</h2>
  <button type="button" id="set-external-values" onclick={() => { name = 'Grace'; selectValue = 'it'; plan = 'pro'; notifications = true; activeTab = 'details'; price = [30, 70] }}>Set external values</button>
  <button type="button" id="toggle-disabled" onclick={() => { dynamicOptions = [...countries, {value: 'fr', label: 'France'}] }}>Add option</button>
	<button type="button" id="add-choice-options" onclick={() => { dynamicChoices = [...choices, {value: 'team', label: 'Team'}]; dynamicViews = [...dynamicViews, {value: 'table', label: 'Table'}] }}>Add choice options</button>
	<button type="button" id="toggle-slider-shape" onclick={() => { shapeValue = typeof shapeValue === 'number' ? [30, 70] : 40 }}>Toggle slider shape</button>
  <button type="button" id="set-error" onclick={() => { externalError = 'Server rejected value' }}>Set server error</button>
  <button type="button" id="toggle-checkbox-state" onclick={() => { mixed = !mixed; disabledCheck = !disabledCheck }}>Toggle checkbox state</button>
	<button type="button" id="enable-reactive-controls" onclick={() => { reactiveDisabled = false }}>Enable reactive controls</button>
	<button type="button" id="remove-selected-options" onclick={() => { removableOptions = [{value: 'a', label: 'Alpha'}]; removableTabs = [{id: 'first', label: 'First', content: 'First'}] }}>Remove selected options</button>
  <output id="binding-output" class="status">{name}|{selectValue}|{plan}|{notifications}|{activeTab}|{price.join(',')}</output>
	<output id="dynamic-binding-output" class="status">{removableChoice}|{removableCombo}|{removableMulti.join(',')}|{removableActiveTab}</output>
	<div data-testid="reactive-controller-fixtures">
		<Select id="svelte-reactive-select" label="Reactive select" options={countries} disabled={reactiveDisabled} />
		<Combobox id="svelte-reactive-combo" label="Reactive combo" options={countries} disabled={reactiveDisabled} />
		<MultiSelect id="svelte-reactive-multi" label="Reactive multi" options={tagOptions} disabled={reactiveDisabled} />
		<Slider id="svelte-reactive-slider" label="Reactive slider" disabled={reactiveDisabled} bind:value={reactiveSlider} />
		<RadioGroup id="svelte-removable-choice" name="removableChoice" label="Removable choice" options={removableOptions} bind:value={removableChoice} />
		<Combobox id="svelte-removable-combo" label="Removable combo" options={removableOptions} bind:value={removableCombo} />
		<MultiSelect id="svelte-removable-multi" label="Removable multi" options={removableOptions} bind:values={removableMulti} />
		<Tabs id="svelte-removable-tabs" items={removableTabs} bind:activeId={removableActiveTab} />
	</div>
</div>

<form id="svelte-form" onsubmit={submitForm}>
  <div class="lab-grid">
    <section class="lab-section" data-lab="text-fields">
      <h2>Text fields</h2>
      <Field id="svelte-field-control" label="Standalone field" description="Field description" hint="Field hint" required children={fieldChild} />
      <Input id="svelte-name" name="name" label="Name" description="Public name" hint="Required" required clearable bind:value={name} {prefix} {suffix} error={externalError} />
      <Input id="svelte-password" name="password" type="password" label="Password" value="secret" revealable />
      <Textarea id="svelte-bio" name="bio" label="Biography" rows={2} minRows={2} maxRows={4} maxlength={120} autoResize showCount bind:value={biography} />
    </section>

    <section class="lab-section" data-lab="choices">
      <h2>Choices</h2>
      <Checkbox id="svelte-terms" name="terms" label="Accept terms" description="Required agreement" required bind:checked={terms} />
      <Checkbox id="svelte-mixed" name="mixed" label="Mixed selection" indeterminate={mixed} />
      <Checkbox id="svelte-disabled-check" name="disabledCheck" label="Disabled choice" disabled={disabledCheck} />
	  <Checkbox id="svelte-error-check" name="errorCheck" label="Invalid choice" description="Choose carefully" error="Selection required" />
      <RadioGroup id="svelte-plan" name="plan" label="Plan" options={dynamicChoices} bind:value={plan} />
      <Switch id="svelte-switch" name="notifications" label="Notifications" description="Receive updates" bind:checked={notifications} />
      <SegmentedControl id="svelte-view" name="view" label="View" options={dynamicViews} bind:value={view} />
    </section>

    <section class="lab-section" data-lab="selections">
      <h2>Selections</h2>
      <Select id="svelte-select" name="country" label="Country select" description="Choose a country" options={dynamicOptions} bind:value={selectValue} trigger={selectTrigger} option={selectOption} />
      <Combobox id="svelte-combobox" name="searchCountry" label="Country combobox" options={countries} bind:value={comboValue} option={comboOption} />
      <Combobox id="svelte-async-combobox" name="asyncCountry" label="Async country" loadOptions={loadOptions} debounceMs={0} bind:value={asyncComboValue} />
      <MultiSelect id="svelte-multi" name="tags" label="Tags" options={tagOptions} maxSelected={2} bind:values={tags} {chip} />
    </section>

    <section class="lab-section" data-lab="overlays">
      <h2>Layers</h2>
      <DropdownMenu id="svelte-menu" ariaLabel="Svelte actions" portal={false} bind:open={menuOpen} trigger={menuTrigger} onSelect={() => { menuSelections += 1 }} items={[
        {id: 'edit', label: 'Edit'},
        {id: 'setting', label: 'Setting', type: 'checkbox', checked: true, keepOpen: true},
        {id: 'compact', label: 'Compact', type: 'radio', group: 'density', checked: true, keepOpen: true},
        {id: 'comfortable', label: 'Comfortable', type: 'radio', group: 'density', keepOpen: true},
        {id: 'more', label: 'More', children: [{id: 'duplicate', label: 'Duplicate'}]},
        {id: 'disabled', label: 'Disabled action', disabled: true}
      ]} />
      <div dir="rtl"><DropdownMenu id="svelte-menu-rtl" ariaLabel="RTL actions" portal={false} triggerLabel="RTL actions" items={[{id: 'rtl-more', label: 'More RTL', children: [{id: 'rtl-child', label: 'RTL child'}]}]} /></div>
      <output id="menu-selection-count">menu selections:{menuSelections}</output>
      <Tooltip id="svelte-tooltip" content="Helpful Svelte context" openDelayMs={0} closeDelayMs={0} children={tooltipChild} />
      <Tooltip id="svelte-tooltip-delayed" content="Delayed Svelte context" openDelayMs={180} closeDelayMs={120} children={delayedTooltipChild} />
      <Popover id="svelte-popover" ariaLabel="Svelte popover" focusOnOpen trapFocus bind:open={popoverOpen} trigger={popoverTrigger} children={popoverBody} />
      <Dialog id="svelte-dialog" title="Confirm action" description="Dialog description" bind:open={dialogOpen} trigger={dialogTrigger} children={nestedDialogBody} />
      <Modal id="svelte-modal" title="Modal title" bind:open={modalOpen} trigger={modalTrigger} children={modalBody} />
    </section>

    <section class="lab-section" data-lab="navigation">
      <h2>Navigation</h2>
      <Tabs id="svelte-tabs" items={[{id: 'overview', label: 'Overview', content: 'Overview panel'}, {id: 'details', label: 'Details', content: 'Details panel'}, {id: 'disabled', label: 'Disabled', disabled: true}]} bind:activeId={activeTab} tab={tabSnippet} panel={panelSnippet} />
      <Tabs id="svelte-tabs-manual" activation="manual" items={[{id: 'first', label: 'Manual first', content: 'Manual first panel'}, {id: 'second', label: 'Manual second', content: 'Manual second panel'}]} />
      <Tabs id="svelte-navigation-tabs" mode="navigation" items={[{id: 'home', label: 'Home', href: '#main'}, {id: 'other', label: 'Other', href: '/cleanup'}]} />
      <Accordion id="svelte-accordion" type="multiple" items={[{id: 'one', title: 'First section', content: 'First panel'}, {id: 'two', title: 'Second section', content: 'Second panel'}, {id: 'disabled', title: 'Disabled section', disabled: true}]} bind:openIds={openAccordion} trigger={accordionTrigger} panel={accordionPanel} />
    </section>

    <section class="lab-section" data-lab="values">
      <h2>Numeric values</h2>
      <NumberInput id="svelte-number" name="quantity" label="Quantity" min={0} max={5} step={1} clampOnBlur bind:value={quantity} />
      <NumberInput id="svelte-localized-number" label="Ποσότητα" value={1} messages={{decrease: 'Μείωση', increase: 'Αύξηση'}} />
      <Slider id="svelte-slider" name="price" label="Price range" min={0} max={100} step={5} minStepsBetweenThumbs={1} bind:value={price} {thumb} />
      <Slider id="svelte-slider-rtl" name="rtlValue" label="RTL value" value={50} direction="rtl" />
      <Slider id="svelte-slider-shape" name="shapeValue" label="Shape value" bind:value={shapeValue} />
      <Part part="editor-surface" as="section" state="ready" orientation="vertical" selected active data-testid="svelte-part" children={partChild} />
    </section>
  </div>
  <button type="submit">Submit Svelte form</button>
  <button type="reset">Reset Svelte form</button>
</form>
<output id="svelte-form-output" class="status" aria-live="polite">{formOutput}</output>
