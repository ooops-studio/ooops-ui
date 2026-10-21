<script lang="ts">
	import {createCalendarController, createDialogController, calendarTimeMin, calendarDatePart, calendarTimePart, formatCalendarInput, parseCalendarInput, defaultCalendarTime, joinCalendarValue, isCalendarInputValid, getUiPart, type CalendarSelection} from '@ooopsstudio/ui-primitives'
	import {onMount, tick, untrack} from 'svelte'
	import DropdownMenu from './DropdownMenu.svelte'
	import type {CalendarFieldProps} from './calendar-types.js'

	const generatedId = $props.id()
	let {id = generatedId, name, startName, endName, form, label, startLabel = 'Start date', endLabel = 'End date',
		parts, monthParts, day, calendarIcon, previousIcon, nextIcon, clearIcon, closeIcon, mode = 'date', dateFormat = 'native', spacedSeparators = false, timeStepMinutes = 15, defaultTime, timeLabel = 'Time', clearable = true, clearLabel = 'Clear date', placeholder, monthLabel: monthInputLabel = 'Month', yearLabel = 'Year', minYear = 1, maxYear = 9999, value = {start: '', end: ''}, range = false, min, max, today, locale = 'en', firstDayOfWeek = 1,
		dir, disabled = false, readOnly = false, required = false, describedBy, isDateDisabled,
		errorMessage = 'Choose an available date or complete date range.', calendarLabel = 'Choose date',
		previousMonthLabel = 'Previous month', nextMonthLabel = 'Next month', closeLabel = 'Close calendar',
		keyboardHelp = 'Arrow keys move by day or week. Home and End move within the week. Page Up and Page Down change month. Hold Shift to change year.',
		class: className = '', onChange, onReset}: CalendarFieldProps & {range?: boolean; onReset?: (value: CalendarSelection) => void} = $props()
	let current = $state<CalendarSelection>(untrack(() => ({...value})))
	let draftError = $state(false)
	const dateValues = (next: CalendarSelection) => ({start: calendarDatePart(next.start), end: calendarDatePart(next.end)})
	const timeFor = (previous: string) => calendarTimePart(previous) || defaultTime || defaultCalendarTime(timeStepMinutes)
	const project = (next: CalendarSelection) => ({start: joinCalendarValue(next.start, timeFor(current.start), mode), end: joinCalendarValue(next.end, timeFor(current.end || current.start), mode)})
	const calendar = untrack(() => createCalendarController({value: dateValues(value), range, ...(today ? {today} : {}), ...(min ? {min: calendarDatePart(min)} : {}), ...(max ? {max: calendarDatePart(max)} : {}),
		locale, firstDayOfWeek, disabled: disabled || readOnly, ...(dir ? {dir} : {}), ...(isDateDisabled ? {isDateDisabled} : {}),
		onChange: next => { current = project(next); draftError = false; onChange?.({...current}) }, onComplete: () => dialogController?.close('select'),
		onFocusDate: date => { void tick().then(() => { if (mounted && dialog.open) root.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus() }) }}))
	let state = $state(calendar.getState()), mounted = $state(false), revision = $state(0)
	let root: HTMLDivElement, dialog: HTMLDialogElement, trigger: HTMLButtonElement, startInput: HTMLInputElement
	let displayStart = $state<HTMLInputElement>(), displayEnd = $state<HTMLInputElement>()
	let endInput = $state<HTMLInputElement>()
	let dialogController = $state.raw<ReturnType<typeof createDialogController> | null>(null)
	const days = $derived.by(() => { revision; state.visibleMonth; return calendar.getDays() })
	const weekdays = $derived.by(() => { revision; return calendar.getWeekdays() })
	const monthLabel = $derived.by(() => { revision; state.visibleMonth; return calendar.formatMonth() })
	const invalid = $derived.by(() => { revision; state.start; state.end; current; return draftError || !calendar.isValid() || !isCalendarInputValid(current.start, mode, min, max, timeStepMinutes) || !isCalendarInputValid(current.end, mode, min, max, timeStepMinutes) || Boolean(range && current.end && current.start > current.end) })
	const description = $derived([describedBy, invalid && `${id}-error`].filter(Boolean).join(' ') || undefined)
	const selected = (date: string) => date === state.start || Boolean(state.end && date >= state.start && date <= state.end)
	function updateValidity() {
		const error = draftError || !calendar.isValid() || !isCalendarInputValid(current.start, mode, min, max, timeStepMinutes) || !isCalendarInputValid(current.end, mode, min, max, timeStepMinutes) || Boolean(range && current.end && current.start > current.end)
		const startControl = dateFormat !== 'native' && mounted ? displayStart : startInput
		const endControl = dateFormat !== 'native' && mounted ? displayEnd : endInput
		startControl?.setCustomValidity(!range && error ? errorMessage : '')
		endControl?.setCustomValidity(range && error ? errorMessage : '')
	}
	function setNative(next: CalendarSelection) {
		if (disabled || readOnly) return
		const changed = current.start !== next.start || current.end !== next.end
		current = next
		draftError = false
		calendar.setValue(dateValues(next))
		if (changed) onChange?.({...next})
		updateValidity()
	}
	function setText(event: Event, end = false, commit = false) {
		const input = event.currentTarget as HTMLInputElement
		const date = parseCalendarInput(input.value, dateFormat, spacedSeparators)
		if (date === null) { draftError = true; updateValidity(); return }
		const next = joinCalendarValue(date, timeFor(end ? current.end : current.start), mode)
		setNative(end ? {...current, end: next} : {start: next, end: range ? current.end : next})
		if (commit) input.value = formatCalendarInput(next, dateFormat, spacedSeparators)
	}
	function setTime(event: Event, end = false) {
		if (!(event.currentTarget as HTMLInputElement).value) { draftError = true; updateValidity(); return }
		const previous = end ? current.end : current.start
		const next = joinCalendarValue(calendarDatePart(previous), (event.currentTarget as HTMLInputElement).value, mode)
		setNative(end ? {...current, end: next} : {start: next, end: range ? current.end : next})
	}
	function moveTo(month: number, year: number) {
		if (!Number.isInteger(year) || year < minYear || year > maxYear) return
		calendar.moveMonth((year - Number(state.visibleMonth.slice(0, 4))) * 12 + month - Number(state.visibleMonth.slice(5)))
	}
	function showCalendar() {
		calendar.focusDate(state.start || today || state.focusedDate)
		dialogController?.open()
	}
	onMount(() => {
		mounted = true
		const unsubscribe = calendar.subscribe(next => { state = next; updateValidity() })
		dialogController = createDialogController({getRoot: () => root, getDialog: () => dialog,
			getRestoreFocusTo: () => trigger,
			getInitialFocus: () => root.querySelector<HTMLButtonElement>(`[data-date="${state.focusedDate}"]`)})
		dialogController.mount()
		const initial = {...value}, owner = startInput.form
		startInput.defaultValue = initial.start
		if (endInput) endInput.defaultValue = initial.end
		let resetTimer: ReturnType<typeof setTimeout>
		const reset = (event: Event) => {
			clearTimeout(resetTimer)
			// Native reset and later listeners can run after a microtask checkpoint.
			resetTimer = setTimeout(() => {
				if (mounted && !event.defaultPrevented) {
					current = {...initial}
					draftError = false
					calendar.setValue(dateValues(initial))
					onReset?.({...initial})
					if (displayStart) displayStart.value = formatCalendarInput(initial.start, dateFormat, spacedSeparators)
					if (displayEnd) displayEnd.value = formatCalendarInput(initial.end, dateFormat, spacedSeparators)
					for (const [index, input] of [...root.querySelectorAll<HTMLInputElement>('[data-part="time-input"]')].entries()) input.value = calendarTimePart(index === 0 ? initial.start : initial.end)
					updateValidity()
				}
			}, 0)
		}
		owner?.addEventListener('reset', reset)
		return () => { mounted = false; clearTimeout(resetTimer); owner?.removeEventListener('reset', reset); unsubscribe(); dialogController?.destroy(); calendar.destroy() }
	})
	$effect(() => {
		current = {...value}
		const options = {value: dateValues(value), range, min: min ? calendarDatePart(min) : undefined, max: max ? calendarDatePart(max) : undefined, locale, firstDayOfWeek, disabled: disabled || readOnly,
			isDateDisabled, dir: dir ?? (mounted ? getComputedStyle(root).direction as 'ltr' | 'rtl' : 'ltr')}
		untrack(() => { calendar.configure(options); revision++; updateValidity() })
		if (disabled || readOnly) dialogController?.close('disabled')
	})
</script>

<div bind:this={root}  data-ooops-ui {...getUiPart(parts, 'root', `ooops-calendar-field ${className}`.trim())}  data-part="root" {dir} role={range ? 'group' : undefined} aria-labelledby={range ? `${id}-label` : undefined}>
	{#if range}<span id={`${id}-label`} {...getUiPart(parts, 'label', undefined)} data-ooops-ui data-part="label">{label}</span>{/if}
	<label for={mounted && dateFormat !== 'native' ? `${id}-display` : id} {...getUiPart(parts, 'input-label', undefined)} data-ooops-ui data-part="input-label">{range ? startLabel : label}</label>
	<input bind:this={startInput} id={id} type={mounted && dateFormat !== 'native' ? 'hidden' : mode === 'datetime' ? 'datetime-local' : 'date'} name={range ? startName ?? (name ? `${name}-start` : undefined) : name}
		{form} {min} {max} {disabled} readonly={readOnly} required={required && (!mounted || dateFormat === 'native')} step={mode === 'datetime' ? timeStepMinutes * 60 : undefined} value={current.start} aria-describedby={description} aria-invalid={!range && invalid || undefined}
		data-ooops-ui {...getUiPart(parts, 'date-input', undefined)}  data-part="date-input" oninput={event => setNative({start: event.currentTarget.value, end: range ? current.end : event.currentTarget.value})} />
	{#if mounted && dateFormat !== 'native'}
		<input bind:this={displayStart} id={`${id}-display`} type="text" {form} {...getUiPart(parts, 'display-input', undefined)} data-ooops-ui data-part="display-input" {disabled} readonly={readOnly} {required} placeholder={placeholder ?? dateFormat} value={formatCalendarInput(current.start, dateFormat, spacedSeparators)} aria-describedby={description} aria-invalid={invalid || undefined} oninput={setText} onblur={event => setText(event, false, true)} />
		{#if mode === 'datetime'}<input type="time" {form} {...getUiPart(parts, 'time-input', undefined)} data-ooops-ui data-part="time-input" aria-label={`${range ? startLabel : label} ${timeLabel}`} value={calendarTimePart(current.start)} min={calendarTimeMin(current.start, min, timeStepMinutes)} max={max && calendarDatePart(max) === calendarDatePart(current.start) ? calendarTimePart(max) || undefined : undefined} step={timeStepMinutes * 60} {disabled} readonly={readOnly} {required} oninput={setTime} />{/if}
	{/if}
	{#if range}
		<label for={mounted && dateFormat !== 'native' ? `${id}-end-display` : `${id}-end`} {...getUiPart(parts, 'input-label', undefined)} data-ooops-ui data-part="input-label">{endLabel}</label>
		<input bind:this={endInput} id={`${id}-end`} type={mounted && dateFormat !== 'native' ? 'hidden' : mode === 'datetime' ? 'datetime-local' : 'date'} name={endName ?? (name ? `${name}-end` : undefined)}
			{form} {min} {max} {disabled} readonly={readOnly} required={required && (!mounted || dateFormat === 'native')} step={mode === 'datetime' ? timeStepMinutes * 60 : undefined} value={current.end} aria-describedby={description} aria-invalid={invalid || undefined}
			data-ooops-ui {...getUiPart(parts, 'date-input', undefined)}  data-part="date-input" oninput={event => setNative({start: current.start, end: event.currentTarget.value})} />
		{#if mounted && dateFormat !== 'native'}
			<input bind:this={displayEnd} id={`${id}-end-display`} type="text" {form} {...getUiPart(parts, 'display-input', undefined)} data-ooops-ui data-part="display-input" {disabled} readonly={readOnly} {required} placeholder={placeholder ?? dateFormat} value={formatCalendarInput(current.end, dateFormat, spacedSeparators)} aria-describedby={description} aria-invalid={invalid || undefined} oninput={event => setText(event, true)} onblur={event => setText(event, true, true)} />
			{#if mode === 'datetime'}<input type="time" {form} {...getUiPart(parts, 'time-input', undefined)} data-ooops-ui data-part="time-input" aria-label={`${endLabel} ${timeLabel}`} value={calendarTimePart(current.end)} min={calendarTimeMin(current.end, min, timeStepMinutes)} max={max && calendarDatePart(max) === calendarDatePart(current.end) ? calendarTimePart(max) || undefined : undefined} step={timeStepMinutes * 60} {disabled} readonly={readOnly} {required} oninput={event => setTime(event, true)} />{/if}
		{/if}
	{/if}
	{#if clearable}<button hidden={!mounted} type="button" {...getUiPart(parts, 'clear', undefined)} data-ooops-ui data-part="clear" disabled={disabled || readOnly || (!current.start && !current.end)} aria-label={clearLabel} onclick={() => setNative({start: '', end: ''})}>{#if clearIcon}{@render clearIcon()}{:else}{clearLabel}{/if}</button>{/if}
	<p {...getUiPart(parts, 'error', undefined)} data-ooops-ui data-part="error" id={`${id}-error`} role="alert" hidden={!invalid}>{errorMessage}</p>
	<button bind:this={trigger} type="button" hidden={!mounted} disabled={disabled || readOnly} onclick={showCalendar}
		aria-haspopup="dialog" aria-controls={`${id}-calendar`} data-ooops-ui {...getUiPart(parts, 'trigger', undefined)}  data-part="trigger"
		aria-label={`${calendarLabel}${state.start ? `, ${state.start}${range && state.end ? ` – ${state.end}` : ''}` : ''}`}>{#if calendarIcon}{@render calendarIcon()}{:else}{calendarLabel}{/if}</button>
	<dialog bind:this={dialog} id={`${id}-calendar`} aria-labelledby={`${id}-month`} aria-describedby={`${id}-help`} data-ooops-ui {...getUiPart(parts, 'calendar-dialog', undefined)}  data-part="calendar-dialog">
		<div data-ooops-ui {...getUiPart(parts, 'surface', undefined)}  data-part="surface">
			<h2 {...getUiPart(parts, 'month-title', undefined, 'position:absolute;inline-size:1px;block-size:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0')} data-ooops-ui data-part="month-title" id={`${id}-month`} aria-live="polite">{monthLabel}</h2>
			<header {...getUiPart(parts, 'calendar-header', undefined)} data-ooops-ui data-part="calendar-header">
				<button {...getUiPart(parts, 'previous', undefined)} data-ooops-ui data-part="previous" type="button" aria-label={previousMonthLabel} onclick={() => calendar.moveMonth(-1)}>{#if previousIcon}{@render previousIcon()}{:else}‹{/if}</button>

				<div {...getUiPart(parts, 'month-controls', undefined)} data-ooops-ui data-part="month-controls">
				<DropdownMenu id={`${id}-month-picker`} parts={monthParts} portal={false} ariaLabel={monthInputLabel} triggerLabel={`${monthInputLabel}: ${new Intl.DateTimeFormat(locale, {month: 'long', timeZone: 'UTC'}).format(new Date(`${state.visibleMonth}-01T12:00:00Z`))}`} items={Array.from({length: 12}, (_, i) => ({id: String(i + 1), value: String(i + 1), type: 'radio' as const, group: 'month', checked: i + 1 === Number(state.visibleMonth.slice(5)), label: new Intl.DateTimeFormat(locale, {month: 'long', timeZone: 'UTC'}).format(new Date(Date.UTC(2026, i, 1)))}))} onSelect={item => moveTo(Number(item.id), Number(state.visibleMonth.slice(0, 4)))} />
				<input {...getUiPart(parts, 'year-input', undefined)} data-ooops-ui data-part="year-input" type="number" form="" aria-label={yearLabel} onkeydown={event => { if (event.key === 'Enter') { event.preventDefault(); moveTo(Number(state.visibleMonth.slice(5)), Number(event.currentTarget.value)) } }} min={minYear} max={maxYear} value={Number(state.visibleMonth.slice(0, 4))} onchange={event => moveTo(Number(state.visibleMonth.slice(5)), Number(event.currentTarget.value))} />
			</div>
				<button {...getUiPart(parts, 'next', undefined)} data-ooops-ui data-part="next" type="button" aria-label={nextMonthLabel} onclick={() => calendar.moveMonth(1)}>{#if nextIcon}{@render nextIcon()}{:else}›{/if}</button>
			</header>

			<table {...getUiPart(parts, 'grid', undefined)} data-ooops-ui data-part="grid" role="grid" aria-labelledby={`${id}-month`} aria-multiselectable={range || undefined} onkeydown={calendar.handleKeyDown}>
				<thead {...getUiPart(parts, 'weekdays', undefined)} data-ooops-ui data-part="weekdays"><tr {...getUiPart(parts, 'week', undefined)} data-ooops-ui data-part="week">{#each weekdays as weekday}<th {...getUiPart(parts, 'weekday', undefined)} data-ooops-ui data-part="weekday" scope="col" abbr={weekday.long}>{weekday.short}</th>{/each}</tr></thead>
				<tbody {...getUiPart(parts, 'weeks', undefined)} data-ooops-ui data-part="weeks">{#each [0, 1, 2, 3, 4, 5] as week}<tr {...getUiPart(parts, 'week', undefined)} data-ooops-ui data-part="week">
					{#each days.slice(week * 7, week * 7 + 7) as date}
						<td {...getUiPart(parts, 'day-cell', undefined)} data-ooops-ui data-part="day-cell" aria-selected={Boolean(date && selected(date))}>
							{#if date}<button type="button" {...getUiPart(parts, 'day', undefined)} data-ooops-ui data-part="day" data-date={date} data-outside-month={date.slice(0, 7) !== state.visibleMonth}
								aria-label={calendar.formatDate(date)} aria-disabled={!calendar.isSelectable(date)}
								tabindex={date === state.focusedDate ? 0 : -1} onclick={() => calendar.select(date)}>{#if day}{@render day({date, day: Number(date.slice(-2)), selected: selected(date), disabled: !calendar.isSelectable(date), outsideMonth: date.slice(0, 7) !== state.visibleMonth})}{:else}{Number(date.slice(-2))}{/if}</button>{/if}
						</td>
					{/each}
				</tr>{/each}</tbody>
			</table>
			<p {...getUiPart(parts, 'help', undefined)} data-ooops-ui data-part="help" id={`${id}-help`}>{keyboardHelp}</p>
			<button {...getUiPart(parts, 'close', undefined)} data-ooops-ui data-part="close" type="button" aria-label={closeLabel} onclick={() => dialogController?.close('close')}>{#if closeIcon}{@render closeIcon()}{:else}{closeLabel}{/if}</button>
		</div>
	</dialog>
</div>
