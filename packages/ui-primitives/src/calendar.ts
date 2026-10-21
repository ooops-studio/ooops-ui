import {createControllerStore} from './store'

/** Calendar dates are ISO YYYY-MM-DD strings, never instants in a time zone. */
export type CalendarSelection = {start: string; end: string}
export type CalendarOptions = {
	range?: boolean
	value?: CalendarSelection
	today?: string
	min?: string | undefined
	max?: string | undefined
	disabled?: boolean
	firstDayOfWeek?: number
	dir?: 'ltr' | 'rtl'
	locale?: string
	isDateDisabled?: ((date: string) => boolean) | undefined
	onChange?: (value: CalendarSelection) => void
	onComplete?: () => void
	onFocusDate?: (date: string) => void
}
export type CalendarState = CalendarSelection & {
	focusedDate: string; visibleMonth: string; disabled: boolean
}

export function parseCalendarDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return null
	const [year, month, day] = value.split('-').map(Number) as [number, number, number]
	const date = new Date(0)
	date.setUTCFullYear(year, month - 1, day)
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day ? date : null
}

function format(date: Date) { return date.toISOString().slice(0, 10) }
function requiredDate(value: string) {
	const date = parseCalendarDate(value)
	if (!date) throw new RangeError(`Invalid calendar date: ${value}`)
	return date
}
function localToday() {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function addCalendarDays(value: string, amount: number): string {
	const date = requiredDate(value)
	date.setUTCDate(date.getUTCDate() + amount)
	if (date.getUTCFullYear() < 1) return '0001-01-01'
	if (date.getUTCFullYear() > 9999) return '9999-12-31'
	return format(date)
}

export function addCalendarMonths(value: string, amount: number): string {
	const date = requiredDate(value), day = date.getUTCDate()
	date.setUTCDate(1)
	date.setUTCMonth(date.getUTCMonth() + amount)
	if (date.getUTCFullYear() < 1) return '0001-01-01'
	if (date.getUTCFullYear() > 9999) return '9999-12-31'
	const last = new Date(date)
	last.setUTCMonth(last.getUTCMonth() + 1, 0)
	date.setUTCDate(Math.min(day, last.getUTCDate()))
	return format(date)
}

export function getCalendarDays(month: string, firstDayOfWeek = 1): string[] {
	const first = requiredDate(month)
	first.setUTCDate(1)
	const offset = (first.getUTCDay() - firstDayOfWeek + 7) % 7
	first.setUTCDate(1 - offset)
	return Array.from({length: 42}, (_, index) => {
		const date = new Date(first)
		date.setUTCDate(date.getUTCDate() + index)
		return date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 ? '' : format(date)
	})
}

/** A headless calendar model shared by DatePicker and DateRange in both adapters. */
export function createCalendarController(initial: CalendarOptions = {}) {
	let options = {...initial}, destroyed = false
	function validateOptions() {
		for (const value of [options.min, options.max, options.today]) if (value) requiredDate(value)
		for (const value of [options.value?.start, options.value?.end]) if (value) requiredDate(value)
		if (options.min && options.max && options.min > options.max) throw new RangeError('Calendar min must not exceed max.')
		if (options.firstDayOfWeek !== undefined && (!Number.isInteger(options.firstDayOfWeek) ||
			options.firstDayOfWeek < 0 || options.firstDayOfWeek > 6))
			throw new RangeError('firstDayOfWeek must be an integer from 0 to 6.')
	}
	validateOptions()
	const clamp = (date: string) => date < (options.min ?? '0001-01-01') ? options.min! : date > (options.max ?? '9999-12-31') ? options.max! : date
	const value = options.value ?? {start: '', end: ''}
	const focusedDate = clamp(value.start || options.today || localToday())
	const store = createControllerStore<CalendarState>({...value, focusedDate,
		visibleMonth: focusedDate.slice(0, 7), disabled: options.disabled ?? false})
	const selectable = (date: string) => Boolean(parseCalendarDate(date)) &&
		(!options.min || date >= options.min) && (!options.max || date <= options.max) &&
		!options.isDateDisabled?.(date)
	const focusDate = (date: string) => {
		if (destroyed) return
		const next = clamp(format(requiredDate(date)))
		store.setState({focusedDate: next, visibleMonth: next.slice(0, 7)})
		options.onFocusDate?.(next)
	}
	function selectionValid(selection: CalendarSelection) {
		if (!selection.start && !selection.end) return true
		if (!selectable(selection.start)) return false
		if (!options.range) return true
		if (!selectable(selection.end) || selection.end < selection.start) return false
		if (options.isDateDisabled) {
			for (let date = selection.start; date < selection.end; date = addCalendarDays(date, 1))
				if (options.isDateDisabled(date)) return false
		}
		return true
	}
	const setValue = (selection: CalendarSelection) => {
		if (destroyed) return
		for (const date of [selection.start, selection.end]) if (date) requiredDate(date)
		store.setState(selection)
	}
	const select = (date: string) => {
		if (destroyed || options.disabled || !selectable(date)) return false
		const state = store.getState()
		let selection = {start: date, end: options.range ? '' : date}
		if (options.range && state.start && !state.end) {
			selection = date < state.start ? {start: date, end: state.start} :
				{start: state.start, end: date}
			if (!selectionValid(selection)) return false
		}
		store.setState({...selection, focusedDate: date, visibleMonth: date.slice(0, 7)})
		options.onChange?.({...selection})
		if (selection.end) options.onComplete?.()
		else options.onFocusDate?.(date)
		return true
	}
	const moveMonth = (amount: number) =>
		focusDate(addCalendarMonths(store.getState().focusedDate, amount))
	const handleKeyDown = (event: KeyboardEvent) => {
		if (destroyed || options.disabled || event.altKey || event.ctrlKey || event.metaKey) return
		const current = store.getState().focusedDate
		const weekday = (requiredDate(current).getUTCDay() - (options.firstDayOfWeek ?? 1) + 7) % 7
		const rtl = options.dir === 'rtl' ? -1 : 1
		let next: string
		switch (event.key) {
			case 'ArrowLeft': next = addCalendarDays(current, -rtl); break
			case 'ArrowRight': next = addCalendarDays(current, rtl); break
			case 'ArrowUp': next = addCalendarDays(current, -7); break
			case 'ArrowDown': next = addCalendarDays(current, 7); break
			case 'Home': next = addCalendarDays(current, -weekday); break
			case 'End': next = addCalendarDays(current, 6 - weekday); break
			case 'PageUp': next = addCalendarMonths(current, event.shiftKey ? -12 : -1); break
			case 'PageDown': next = addCalendarMonths(current, event.shiftKey ? 12 : 1); break
			case 'Enter': case ' ': event.preventDefault(); select(current); return
			default: return
		}
		event.preventDefault()
		focusDate(next)
	}
	return {
		getState: store.getState, subscribe: store.subscribe,
		focusDate, moveMonth, handleKeyDown, select, setValue,
		isSelectable: selectable,
		isValid: () => selectionValid(store.getState()),
		getDays: () => getCalendarDays(`${store.getState().visibleMonth}-01`, options.firstDayOfWeek ?? 1),
		formatDate: (date: string) => new Intl.DateTimeFormat(options.locale, {dateStyle: 'full', timeZone: 'UTC'}).format(requiredDate(date)),
		formatMonth: () => new Intl.DateTimeFormat(options.locale, {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(requiredDate(`${store.getState().visibleMonth}-01`)),
		getWeekdays: () => Array.from({length: 7}, (_, index) => {
			const date = requiredDate(addCalendarDays('2026-01-04', ((options.firstDayOfWeek ?? 1) + index) % 7))
			return {
				short: new Intl.DateTimeFormat(options.locale, {weekday: 'short', timeZone: 'UTC'}).format(date),
				long: new Intl.DateTimeFormat(options.locale, {weekday: 'long', timeZone: 'UTC'}).format(date)
			}
		}),
		configure(next: Partial<CalendarOptions>) {
			if (destroyed) return
			const previous = options
			options = {...options, ...next}
			try { validateOptions() } catch(error) { options = previous; throw error }
			if (next.value) setValue(next.value)
			const focused = clamp(store.getState().focusedDate)
			store.setState({disabled: options.disabled ?? false, focusedDate: focused,
				visibleMonth: focused.slice(0, 7)})
		},
		destroy() { destroyed = true; store.clear() }
	}
}
