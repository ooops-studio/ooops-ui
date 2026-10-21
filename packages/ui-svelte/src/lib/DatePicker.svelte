<script lang="ts">
	import CalendarField from './CalendarField.svelte'
	import type {DatePickerProps} from './calendar-types.js'
	let {value = $bindable(''), onChange, ...props}: DatePickerProps = $props()
</script>
<CalendarField {...props} value={{start: value, end: value}} onChange={next => { value = next.start; onChange?.(value) }} onReset={next => { value = next.start }} />
