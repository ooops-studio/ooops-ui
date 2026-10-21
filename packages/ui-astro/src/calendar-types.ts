import type {CalendarSelection} from '@ooopsstudio/ui-primitives'

export type CalendarFieldProps = {
	monthParts?: import('@ooopsstudio/ui-primitives').UiParts | undefined
	parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined
	mode?: import('@ooopsstudio/ui-primitives').CalendarInputMode
	dateFormat?: import('@ooopsstudio/ui-primitives').CalendarInputFormat
	spacedSeparators?: boolean
	timeStepMinutes?: number
	defaultTime?: string
	timeLabel?: string
	clearable?: boolean
	clearLabel?: string
	placeholder?: string
	monthLabel?: string
	yearLabel?: string
	minYear?: number
	maxYear?: number
	id: string
	name?: string
	startName?: string
	endName?: string
	form?: string
	label: string
	startLabel?: string
	endLabel?: string
	value?: CalendarSelection
	min?: string
	max?: string
	today?: string
	locale?: string
	firstDayOfWeek?: number
	dir?: 'ltr' | 'rtl'
	disabled?: boolean
	readOnly?: boolean
	required?: boolean
	describedBy?: string
	errorMessage?: string
	calendarLabel?: string
	previousMonthLabel?: string
	nextMonthLabel?: string
	closeLabel?: string
	keyboardHelp?: string
	disabledDates?: string[]
	class?: string
}
export type DatePickerProps = Omit<CalendarFieldProps, 'value' | 'startName' | 'endName' | 'startLabel' | 'endLabel'> & {value?: string}
export type DateRangeProps = CalendarFieldProps
