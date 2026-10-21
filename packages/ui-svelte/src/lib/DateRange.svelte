<script lang="ts">
	import CalendarField from './CalendarField.svelte'
	import type {DateRangeProps} from './calendar-types.js'
	let {value = $bindable({start: '', end: ''}), onChange, ...props}: DateRangeProps = $props()
</script>
<CalendarField {...props} {value} range onChange={next => { value = next; onChange?.(next) }} onReset={next => { value = next }} />
