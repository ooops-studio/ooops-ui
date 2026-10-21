import {parseCalendarDate} from './calendar'

export type CalendarInputFormat = 'native' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
export type CalendarInputMode = 'date' | 'datetime'
export const calendarDatePart = (value: string) => value.slice(0, 10)
export const calendarTimePart = (value: string) => value.slice(11, 16)
export function formatCalendarInput(
	value: string,
	format: CalendarInputFormat,
	spaced = false
): string {
	if (!value) return ''
	const [year, month, day] = calendarDatePart(value).split('-')
	const result =
		format === 'DD-MM-YYYY'
			? `${day}-${month}-${year}`
			: format === 'MM-DD-YYYY'
				? `${month}-${day}-${year}`
				: `${year}-${month}-${day}`
	return spaced ? result.replaceAll('-', ' - ') : result
}
export function parseCalendarInput(
	raw: string,
	format: CalendarInputFormat,
	spaced = false
): string | null {
	const text = spaced ? raw.trim().replace(/\s+/g, '') : raw.trim()
	if (!text) return ''
	const match = (
		format === 'native' || format === 'YYYY-MM-DD'
			? /^(\d{4})-(\d{2})-(\d{2})$/
			: /^(\d{2})-(\d{2})-(\d{4})$/
	).exec(text)
	if (!match) return null
	const iso =
		format === 'DD-MM-YYYY'
			? `${match[3]}-${match[2]}-${match[1]}`
			: format === 'MM-DD-YYYY'
				? `${match[3]}-${match[1]}-${match[2]}`
				: text
	return parseCalendarDate(iso) ? iso : null
}
export function defaultCalendarTime(stepMinutes = 15, now = new Date()): string {
	if (!Number.isInteger(stepMinutes) || stepMinutes < 1 || stepMinutes > 1440)
		throw new RangeError('timeStepMinutes must be an integer from 1 to 1440')
	const minutes =
		(Math.ceil((now.getHours() * 60 + now.getMinutes()) / stepMinutes) * stepMinutes) % 1440
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
export function joinCalendarValue(
	date: string,
	time: string,
	mode: CalendarInputMode
): string {
	if (!date) return ''
	return mode === 'date' ? date : time ? `${date}T${time}` : ''
}
export function isCalendarInputValid(
	value: string,
	mode: CalendarInputMode,
	min?: string,
	max?: string,
	stepMinutes = 15
): boolean {
	if (!value) return true
	if (!parseCalendarDate(calendarDatePart(value))) return false
	if (mode === 'datetime') {
		const time = /^(\d{2}):(\d{2})$/.exec(calendarTimePart(value))
		if (!time || value.length !== 16 || Number(time[1]) > 23 || Number(time[2]) > 59)
			return false
		const minutes =
			parseCalendarDate(calendarDatePart(value))!.getTime() / 60000 +
			Number(time[1]) * 60 +
			Number(time[2])
		const baseDate = min ? parseCalendarDate(calendarDatePart(min)) : null
		const base = baseDate
			? baseDate.getTime() / 60000 +
				Number(calendarTimePart(min!).slice(0, 2)) * 60 +
				Number(calendarTimePart(min!).slice(3))
			: 0
		if ((minutes - base) % stepMinutes !== 0) return false
	} else if (value.length !== 10) return false
	const minimum = mode === 'datetime' && min?.length === 10 ? `${min}T00:00` : min
	const maximum = mode === 'datetime' && max?.length === 10 ? `${max}T23:59` : max
	return (!minimum || value >= minimum) && (!maximum || value <= maximum)
}

/** Earliest valid time on this calendar day, also the native time input's step base. */
export function calendarTimeMin(value: string, min?: string, stepMinutes = 15): string {
	const date = parseCalendarDate(calendarDatePart(value))
	const bound = min ? parseCalendarDate(calendarDatePart(min)) : null
	const boundTime = min ? calendarTimePart(min) : ''
	if (bound && date && calendarDatePart(value) === calendarDatePart(min!) && boundTime)
		return boundTime
	const base = bound
		? bound.getTime() / 60000 + Number(boundTime.slice(0, 2)) * 60 + Number(boundTime.slice(3))
		: 0
	const day = date ? date.getTime() / 60000 : 0
	const offset = (((base - day) % stepMinutes) + stepMinutes) % stepMinutes
	return `${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(offset % 60).padStart(2, '0')}`
}
