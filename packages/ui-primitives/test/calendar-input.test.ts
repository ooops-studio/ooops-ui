import {describe, expect, it} from 'vitest'

import {
	calendarTimeMin,
	calendarDatePart,
	calendarTimePart,
	defaultCalendarTime,
	formatCalendarInput,
	isCalendarInputValid,
	joinCalendarValue,
	parseCalendarInput
} from '../src/calendar-input'
import {getUiPart} from '../src/styling'

describe('calendar display and local datetime values', () => {
	it('round trips all Workspace formats without converting time zones or accepting impossible dates', () => {
		for (const [format, text] of [
			['native', '2024-02-29'],
			['YYYY-MM-DD', '2024-02-29'],
			['DD-MM-YYYY', '29-02-2024'],
			['MM-DD-YYYY', '02-29-2024']
		] as const) {
			expect(formatCalendarInput('2024-02-29T17:30', format)).toBe(text)
			expect(parseCalendarInput(text, format)).toBe('2024-02-29')
			expect(parseCalendarInput('', format)).toBe('')
			expect(parseCalendarInput('bad', format)).toBeNull()
		}
		expect(formatCalendarInput('', 'DD-MM-YYYY')).toBe('')
		expect(formatCalendarInput('2026-10-21', 'DD-MM-YYYY', true)).toBe('21 - 10 - 2026')
		expect(parseCalendarInput('21 - 10 - 2026', 'DD-MM-YYYY', true)).toBe('2026-10-21')
		expect(parseCalendarInput('29-02-2023', 'DD-MM-YYYY')).toBeNull()
		expect(parseCalendarInput('2026-13-01', 'native')).toBeNull()
		expect(calendarDatePart('2026-03-29T02:30')).toBe('2026-03-29')
		expect(calendarTimePart('2026-03-29T02:30')).toBe('02:30')
		expect(joinCalendarValue('2026-10-21', '12:30', 'date')).toBe('2026-10-21')
		expect(joinCalendarValue('2026-10-21', '12:30', 'datetime')).toBe('2026-10-21T12:30')
		expect(joinCalendarValue('2026-10-21', '', 'datetime')).toBe('')
		expect(joinCalendarValue('', '12:30', 'datetime')).toBe('')
	})
	it('rounds default time to the requested step including midnight rollover', () => {
		expect(defaultCalendarTime(15, new Date(2026, 9, 21, 13, 7))).toBe('13:15')
		expect(defaultCalendarTime(15, new Date(2026, 9, 21, 23, 59))).toBe('00:00')
		expect(defaultCalendarTime(undefined, new Date(2026, 9, 21, 12, 0))).toBe('12:00')
		expect(defaultCalendarTime()).toMatch(/^\d{2}:\d{2}$/)
		for (const step of [0, -1, 1.5, 1441])
			expect(() => defaultCalendarTime(step)).toThrow(RangeError)
	})
	it('validates date/time, local bounds and time steps, including a min-offset step base', () => {
		expect(isCalendarInputValid('', 'date')).toBe(true)
		for (const value of ['bad', '2023-02-29', '2026-10-21T12:30'])
			expect(isCalendarInputValid(value, 'date')).toBe(false)
		expect(isCalendarInputValid('2026-10-21', 'date')).toBe(true)
		expect(isCalendarInputValid('2026-10-21', 'date', '2026-10-22')).toBe(false)
		expect(isCalendarInputValid('2026-10-21', 'date', undefined, '2026-10-20')).toBe(false)
		for (const value of [
			'2026-10-21',
			'2026-10-21T24:00',
			'2026-10-21T23:60',
			'2026-10-21T12:01',
			'2026-10-21T12:30Z'
		])
			expect(isCalendarInputValid(value, 'datetime')).toBe(false)
		expect(isCalendarInputValid('2026-10-21T12:30', 'datetime')).toBe(true)
		expect(
			isCalendarInputValid('2026-10-22T00:02', 'datetime', '2026-10-21T00:00', undefined, 7)
		).toBe(true)
		expect(
			isCalendarInputValid('2026-10-22T00:00', 'datetime', '2026-10-21T00:00', undefined, 7)
		).toBe(false)
		expect(isCalendarInputValid('2026-10-21T23:45', 'datetime', undefined, '2026-10-21')).toBe(
			true
		)
		expect(
			isCalendarInputValid(
				'2026-10-21T12:35',
				'datetime',
				'2026-10-21T12:05',
				'2026-10-21T13:05'
			)
		).toBe(true)
		expect(isCalendarInputValid('2026-10-21T12:30', 'datetime', '2026-10-21', undefined)).toBe(
			true
		)
	})
})
it('merges consumer classes and styles without permitting semantic overrides', () => {
	expect(getUiPart(undefined, 'root')).toEqual({class: undefined, style: undefined})
	expect(getUiPart({}, 'day', null, null)).toEqual({class: undefined, style: undefined})
	expect(
		getUiPart(
			{day: {class: 'brand', style: 'color:red'}},
			'day',
			['base', false, undefined],
			'padding:2px'
		)
	).toEqual({class: 'base brand', style: 'padding:2px;color:red'})
	expect(getUiPart({root: {}}, 'root', 'base')).toEqual({class: 'base', style: undefined})
})

it('aligns native time constraints with datetime min-offset and cross-day steps', () => {
	expect(calendarTimeMin('2026-10-21T12:35', '2026-10-21T12:05')).toBe('12:05')
	expect(calendarTimeMin('2026-10-22T12:35', '2026-10-21T12:05')).toBe('00:05')
	expect(calendarTimeMin('2026-10-22T00:02', '2026-10-21T00:00', 7)).toBe('00:02')
	expect(calendarTimeMin('2026-10-21T12:30')).toBe('00:00')
	expect(calendarTimeMin('', '2026-10-21')).toBe('00:00')
	expect(calendarTimeMin('')).toBe('00:00')
})
