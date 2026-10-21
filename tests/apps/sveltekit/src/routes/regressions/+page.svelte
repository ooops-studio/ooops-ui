<script lang="ts">
	import {Accordion, Checkbox, Combobox, Input, MultiSelect, RadioGroup, SegmentedControl, Slider, Switch, Textarea} from '@ooopsstudio/ui-svelte'
	import {onMount} from 'svelte'
	let hydrated = $state(false)
	let text = $state('A'), area = $state('A'), textEvents = $state<string[]>([]), areaEvents = $state<string[]>([])
	let checked = $state(true), enabled = $state(true), disabled = $state(true)
	let readonly = $state(true), locked = $state('Locked')
	let serialized = $state(''), plan = $state('a'), view = $state('a')
	let mode = $state<'single' | 'multiple'>('single'), collapsible = $state(true), openIds = $state<string[]>([])
	const choices = [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}]
	onMount(() => { hydrated = true })
	function submit(event: SubmitEvent) {
		event.preventDefault()
		serialized = JSON.stringify([...new FormData(event.currentTarget as HTMLFormElement)])
	}
</script>
<h1>Migration regression laboratory</h1>
<p id="hydration-state">{hydrated ? 'hydrated' : 'server'}</p>
<section aria-label="Text callbacks">
	<Input id="reg-input" label="Regression input" bind:value={text} onChange={value => { textEvents = [...textEvents, value] }} />
	<Textarea id="reg-textarea" label="Regression textarea" bind:value={area} onChange={value => { areaEvents = [...areaEvents, value] }} />
	<button type="button" onclick={() => { text = 'B'; area = 'B' }}>Set parent values</button>
	<output id="text-events">{JSON.stringify(textEvents)}</output><output id="area-events">{JSON.stringify(areaEvents)}</output>
</section>
<!-- Status text is not a form-associated output: native reset must not replace diagnostic text nodes. -->
<form id="checks" onsubmit={submit}>
	<Checkbox id="reg-checked" name="checked" label="Initially checked" bind:checked />
	<Switch id="reg-switch" name="enabled" label="Initially enabled" bind:checked={enabled} />
	<button type="reset">Reset checked defaults</button>
	<p id="check-bindings" role="status">{String(checked)}|{String(enabled)}</p>
</form>
<form id="projections" onsubmit={submit}>
	<Combobox id="reg-combo" name="country" label="Country" value="a" options={choices} {disabled} />
	<MultiSelect id="reg-multi" name="tags" label="Tags" values={['a']} options={choices} {disabled} />
	<SegmentedControl id="reg-segments" name="view" label="View" value="a" options={choices} {disabled} />
	<Slider id="reg-slider" name="volume" label="Volume" value={[20, 80]} {disabled} />
	<button type="button" onclick={() => { disabled = !disabled }}>Toggle disabled</button>
	<button type="submit">Serialize controls</button>
	<output id="projection-output">{serialized}</output>
</form>
<section aria-label="Readonly clear">
	<Input id="reg-readonly" label="Locked input" bind:value={locked} {readonly} clearable />
	<button type="button" onclick={() => { readonly = !readonly }}>Toggle readonly</button>
</section>
<form id="choice-reset">
	<RadioGroup id="reg-radio" name="plan" label="Reset plan" options={choices} bind:value={plan} />
	<SegmentedControl id="reg-reset-segments" name="view" label="Reset view" options={choices} bind:value={view} />
	<button type="reset">Reset choices</button>
	<p id="choice-bindings" role="status">{plan}|{view}</p>
</form>
<section aria-label="Accordion configuration">
	<button type="button" onclick={() => { mode = mode === 'single' ? 'multiple' : 'single' }}>Toggle accordion mode</button>
	<button type="button" onclick={() => { collapsible = !collapsible }}>Toggle collapsible</button>
	<Accordion headingLevel={2} id="reg-accordion" type={mode} {collapsible} bind:openIds items={[{id: 'first', title: 'First regression section', content: 'First panel'}, {id: 'second', title: 'Second regression section', content: 'Second panel'}]} />
	<output id="accordion-binding">{JSON.stringify(openIds)}</output>
</section>
