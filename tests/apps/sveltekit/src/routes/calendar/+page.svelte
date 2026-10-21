<script lang="ts">
	import {DatePicker, DateRange} from '@ooopsstudio/ui-svelte'
	import {onMount} from 'svelte'
	let value = $state('2026-10-21'), range = $state({start: '', end: ''}), ready = $state(false), disabled = $state(false)
	let values = $state(''), changes = $state(0), resetBlocked = $state(false)
	onMount(() => { ready = true })
</script>
<h1>Calendar contracts</h1><p id="ready">{ready ? 'ready' : 'server'}</p>
<form id="dates" onsubmit={event => { event.preventDefault(); values = JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }} onreset={event => { if (resetBlocked) event.preventDefault() }}>
	<DatePicker id="event-date" label="Event date" name="date" bind:value {disabled} min="2026-10-01" max="2026-12-31" today="2026-10-21" required onChange={() => { changes++ }} />
	<DateRange id="trip" label="Travel dates" name="trip" bind:value={range} today="2026-10-21" min="2026-10-01" max="2026-12-31" isDateDisabled={date => date === '2026-10-25'} />
	<DatePicker id="locked" label="Locked date" value="2026-10-21" disabled />
	<DatePicker id="readonly" label="Read only date" value="2026-10-21" readOnly />
	<button type="submit">Submit dates</button><button type="reset">Reset dates</button>
</form>
<button onclick={() => { disabled = !disabled }}>Toggle disabled date</button>
<button onclick={() => { value = '2026-11-30' }}>Set external date</button>
<button onclick={() => { resetBlocked = !resetBlocked }}>Toggle reset prevention</button>
<p id="form-values">{values}</p><p id="changes">{changes}</p>
<a href="/cleanup">Leave calendar</a>

{#snippet brandedDay(context: import('@ooopsstudio/ui-svelte').CalendarDayContext)}<span data-custom-day>{context.day}</span>{/snippet}
{#snippet previousIcon()}<span data-nav-glyph aria-hidden="true">←</span>{/snippet}
<form id="formatted-dates">
  <DatePicker day={brandedDay} {previousIcon} id="formatted" label="Formatted date" name="formatted" value="2026-10-21" dateFormat="DD-MM-YYYY" spacedSeparators min="2026-10-01" max="2026-12-31" today="2026-10-21" required parts={{day: {class: 'branded-day', style: 'background: rgb(20, 60, 90); color: white; border-radius: 8px'}, 'calendar-dialog': {class: 'branded-calendar', style: 'border: 3px solid rgb(20, 60, 90)'}, previous: {style: 'color: rgb(80, 20, 120)'}}} />
  <DatePicker id="appointment" label="Appointment" name="appointment" mode="datetime" dateFormat="MM-DD-YYYY" value="2026-10-21T13:35" min="2026-10-21T12:05" max="2026-12-31T18:00" timeStepMinutes={15} defaultTime="12:00" today="2026-10-21" required />
  <DatePicker id="iso-formatted" label="ISO formatted date" dateFormat="YYYY-MM-DD" value="2026-10-21" />
  <button type="submit">Submit formatted dates</button><button type="reset">Reset formatted dates</button>
</form>

<form id="external-dates"><button type="reset">Reset external dates</button></form>
<DatePicker id="external-date" form="external-dates" label="External date" name="outside" dateFormat="DD-MM-YYYY" value="2026-10-21" required />
<DateRange id="agenda" form="external-dates" name="agenda" label="Agenda" mode="datetime" dateFormat="YYYY-MM-DD" value={{start: '2026-10-21T10:00', end: '2026-10-21T11:00'}} />
