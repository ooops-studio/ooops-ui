import {
	createCalendarController,
	createDialogController,
	UI_EVENTS,
	calendarTimeMin,
	calendarDatePart,
	calendarTimePart,
	formatCalendarInput,
	parseCalendarInput,
	defaultCalendarTime,
	joinCalendarValue,
	isCalendarInputValid,
	getUiPart,
	type CalendarOptions,
	type CalendarSelection,
	type CalendarInputMode,
	type CalendarInputFormat,
	type UiParts
} from '@ooopsstudio/ui-primitives'

import {mountUiRoots, readUiConfig} from './shared'

type Config = CalendarOptions & {
	parts?: UiParts
	mode: CalendarInputMode
	dateFormat: CalendarInputFormat
	spacedSeparators: boolean
	timeStepMinutes: number
	defaultTime?: string
	minYear: number
	maxYear: number
	monthInputLabel: string
	disabledDates: string[]
	errorMessage: string
	calendarLabel: string
}
export const installCalendar = (scope?: ParentNode) =>
	mountUiRoots(
		'[data-ooops-astro-calendar]',
		(root) => {
			const config = readUiConfig<Config>(root)
			const dayTemplate = root.querySelector<HTMLTemplateElement>(
				'[data-calendar-day-template]'
			)
			const start = root.querySelector<HTMLInputElement>('[data-date-start]')!,
				end = root.querySelector<HTMLInputElement>('[data-date-end]')
			const displayStart = root.querySelector<HTMLInputElement>('[data-display-start]'),
				displayEnd = root.querySelector<HTMLInputElement>('[data-display-end]')
			const trigger = root.querySelector<HTMLButtonElement>('[data-part="trigger"]')!,
				dialog = root.querySelector<HTMLDialogElement>('dialog')!
			const clear = root.querySelector<HTMLButtonElement>('[data-part="clear"]')
			const grid = dialog.querySelector<HTMLTableElement>('table')!,
				body = grid.tBodies[0]!,
				title = dialog.querySelector('h2')!
			const monthMenu = dialog.querySelector<HTMLElement>('[data-ooops-menu-content]')!
			const month = dialog.querySelector<HTMLElement>(
				'[data-ooops-menu-root] [data-part="trigger"]'
			)!
			const year = dialog.querySelector<HTMLInputElement>('[data-part="year-input"]')!
			const error = root.querySelector<HTMLElement>('[data-calendar-error]')!
			const externalDescription = start
				.getAttribute('aria-describedby')
				?.split(' ')
				.filter((id) => id !== error.id)
				.join(' ')
			let disposed = false,
				projecting = false,
				draftError = false
			let current = {...config.value!},
				resetTimer: ReturnType<typeof setTimeout>
			const dateValues = (value: CalendarSelection) => ({
				start: calendarDatePart(value.start),
				end: calendarDatePart(value.end)
			})
			const timeFor = (previous: string) =>
				calendarTimePart(previous) ||
				config.defaultTime ||
				defaultCalendarTime(config.timeStepMinutes)
			const emit = () => {
				projecting = true
				try {
					for (const input of [start, end])
						if (input) {
							input.dispatchEvent(new Event('input', {bubbles: true}))
							input.dispatchEvent(new Event('change', {bubbles: true}))
						}
				} finally {
					projecting = false
				}
				root.dispatchEvent(
					new CustomEvent(UI_EVENTS.dateChange, {
						bubbles: true,
						detail: {value: config.range ? {...current} : current.start}
					})
				)
			}
			const calendar = createCalendarController({
				...config,
				value: dateValues(current),
				min: config.min ? calendarDatePart(config.min) : undefined,
				max: config.max ? calendarDatePart(config.max) : undefined,
				dir: config.dir ?? (getComputedStyle(root).direction as 'ltr' | 'rtl'),
				isDateDisabled: (date) => config.disabledDates.includes(date),
				onChange: (selection) => {
					current = {
						start: joinCalendarValue(selection.start, timeFor(current.start), config.mode),
						end: joinCalendarValue(
							selection.end,
							timeFor(current.end || current.start),
							config.mode
						)
					}
					draftError = false
					update()
					emit()
				},
				onComplete: () => controller.close('select'),
				onFocusDate: (date) => {
					queueMicrotask(() => {
						if (!disposed && dialog.open)
							body.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus()
					})
				}
			})
			const controller = createDialogController({
				getRoot: () => root,
				getDialog: () => dialog,
				getRestoreFocusTo: () => trigger,
				getInitialFocus: () =>
					body.querySelector<HTMLButtonElement>(
						`[data-date="${calendar.getState().focusedDate}"]`
					)
			})
			const cleanups: Array<() => void> = []
			function listen(target: EventTarget, type: string, handler: EventListener) {
				target.addEventListener(type, handler)
				cleanups.push(() => target.removeEventListener(type, handler))
			}
			function stylePart(element: HTMLElement, part: string) {
				element.dataset.ooopsUi = ''
				element.dataset.part = part
				const attrs = getUiPart(config.parts, part)
				if (attrs.class) element.className = attrs.class
				if (attrs.style) element.setAttribute('style', attrs.style)
			}
			function update() {
				const state = calendar.getState()
				start.value = current.start
				if (end) end.value = current.end
				const invalid =
					draftError ||
					!calendar.isValid() ||
					!isCalendarInputValid(
						current.start,
						config.mode,
						config.min,
						config.max,
						config.timeStepMinutes
					) ||
					!isCalendarInputValid(
						current.end,
						config.mode,
						config.min,
						config.max,
						config.timeStepMinutes
					) ||
					Boolean(config.range && current.end && current.start > current.end)
				error.hidden = !invalid
				for (const [input, display, value] of [
					[start, displayStart, current.start],
					[end, displayEnd, current.end]
				] as const)
					if (input) {
						const control = display ?? input
						control.setCustomValidity(invalid ? config.errorMessage : '')
						if (invalid) control.setAttribute('aria-invalid', 'true')
						else control.removeAttribute('aria-invalid')
						const description = [externalDescription, invalid && error.id]
							.filter(Boolean)
							.join(' ')
						if (description) control.setAttribute('aria-describedby', description)
						else control.removeAttribute('aria-describedby')
						if (display && document.activeElement !== display)
							display.value = formatCalendarInput(
								value,
								config.dateFormat,
								config.spacedSeparators
							)
					}
				for (const [selector, value] of [
					['[data-time-start]', current.start],
					['[data-time-end]', current.end]
				]) {
					const time = root.querySelector<HTMLInputElement>(selector!)
					if (time) {
						time.min = calendarTimeMin(value!, config.min, config.timeStepMinutes)
						time.max =
							config.max && calendarDatePart(config.max) === calendarDatePart(value!)
								? calendarTimePart(config.max)
								: ''
						if (document.activeElement !== time) time.value = calendarTimePart(value!)
					}
				}
				if (clear)
					clear.disabled = Boolean(config.disabled || (!current.start && !current.end))
				trigger.ariaLabel = `${config.calendarLabel}${current.start ? `, ${current.start}${config.range && current.end ? ` – ${current.end}` : ''}` : ''}`
				title.textContent = calendar.formatMonth()
				month.textContent = `${config.monthInputLabel}: ${new Intl.DateTimeFormat(config.locale, {month: 'long', timeZone: 'UTC'}).format(new Date(`${state.visibleMonth}-01T12:00:00Z`))}`
				for (const option of monthMenu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
					option.setAttribute(
						'aria-checked',
						String(Number(option.dataset.value) === Number(state.visibleMonth.slice(5)))
					)
				year.value = String(Number(state.visibleMonth.slice(0, 4)))
				const days = calendar.getDays(),
					rows: HTMLTableRowElement[] = []
				for (let week = 0; week < 6; week++) {
					const row = document.createElement('tr')
					stylePart(row, 'week')
					for (const date of days.slice(week * 7, week * 7 + 7)) {
						const cell = document.createElement('td')
						stylePart(cell, 'day-cell')
						cell.ariaSelected = String(
							Boolean(
								date &&
								(date === state.start ||
									(state.end && date >= state.start && date <= state.end))
							)
						)
						if (date) {
							const button = document.createElement('button')
							stylePart(button, 'day')
							button.type = 'button'
							button.dataset.date = date
							button.dataset.outsideMonth = String(date.slice(0, 7) !== state.visibleMonth)
							button.ariaLabel = calendar.formatDate(date)
							button.ariaDisabled = String(!calendar.isSelectable(date))
							button.tabIndex = date === state.focusedDate ? 0 : -1
							if (dayTemplate) {
								button.append(dayTemplate.content.cloneNode(true))
								for (const label of button.querySelectorAll('[data-calendar-day-number]'))
									label.textContent = String(Number(date.slice(-2)))
							} else button.textContent = String(Number(date.slice(-2)))
							cell.append(button)
						}
						row.append(cell)
					}
					rows.push(row)
				}
				body.replaceChildren(...rows)
			}
			const commit = (next: CalendarSelection) => {
				if (config.disabled) return
				const changed = current.start !== next.start || current.end !== next.end
				current = next
				draftError = false
				calendar.setValue(dateValues(next))
				update()
				if (changed) emit()
			}
			for (const [input, display, isEnd] of [
				[start, displayStart, false],
				[end, displayEnd, true]
			] as const)
				if (input) {
					if (display) {
						const required = input.required
						input.type = 'hidden'
						input.required = false
						display.hidden = false
						display.required = required
						root.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)!.htmlFor =
							display.id
						const typed = (event: Event) => {
							const date = parseCalendarInput(
								(event.currentTarget as HTMLInputElement).value,
								config.dateFormat,
								config.spacedSeparators
							)
							if (date === null) {
								draftError = true
								update()
								return
							}
							const value = joinCalendarValue(
								date,
								timeFor(isEnd ? current.end : current.start),
								config.mode
							)
							commit(
								isEnd
									? {...current, end: value}
									: {start: value, end: config.range ? current.end : value}
							)
						}
						listen(display, 'input', typed)
						listen(display, 'blur', typed)
					}
					listen(input, 'input', () => {
						if (!projecting)
							commit({start: start.value, end: config.range ? end!.value : start.value})
					})
				}
			for (const [selector, isEnd] of [
				['[data-time-start]', false],
				['[data-time-end]', true]
			] as const) {
				const time = root.querySelector<HTMLInputElement>(selector)
				if (time) {
					time.hidden = false
					time.required = Boolean(displayStart?.required)
					listen(time, 'input', () => {
						if (!time.value) {
							draftError = true
							update()
							return
						}
						const previous = isEnd ? current.end : current.start
						const value = joinCalendarValue(
							calendarDatePart(previous),
							time.value,
							config.mode
						)
						commit(
							isEnd
								? {...current, end: value}
								: {start: value, end: config.range ? current.end : value}
						)
					})
				}
			}
			listen(trigger, 'click', () => {
				calendar.focusDate(
					calendarDatePart(current.start) || config.today || calendar.getState().focusedDate
				)
				controller.open()
			})
			listen(grid, 'keydown', (event) => calendar.handleKeyDown(event as KeyboardEvent))
			listen(grid, 'click', (event) => {
				const date = (event.target as HTMLElement).closest<HTMLElement>('[data-date]')?.dataset
					.date
				if (date) calendar.select(date)
			})
			listen(dialog.querySelector('[data-calendar-previous]')!, 'click', () =>
				calendar.moveMonth(-1)
			)
			listen(dialog.querySelector('[data-calendar-next]')!, 'click', () =>
				calendar.moveMonth(1)
			)
			listen(dialog.querySelector('[data-calendar-close]')!, 'click', () =>
				controller.close('close')
			)
			const navigate = (selectedMonth = Number(calendar.getState().visibleMonth.slice(5))) => {
				const y = Number(year.value)
				if (Number.isInteger(y) && y >= config.minYear && y <= config.maxYear)
					calendar.moveMonth(
						(y - Number(calendar.getState().visibleMonth.slice(0, 4))) * 12 +
							selectedMonth -
							Number(calendar.getState().visibleMonth.slice(5))
					)
			}
			listen(monthMenu, 'ooops:menu-select', (event) =>
				navigate(Number((event as CustomEvent<{value: string}>).detail.value))
			)
			listen(year, 'change', () => navigate())
			listen(year, 'keydown', (event) => {
				if ((event as KeyboardEvent).key === 'Enter') {
					event.preventDefault()
					navigate()
				}
			})
			if (clear) {
				clear.hidden = false
				listen(clear, 'click', () => commit({start: '', end: ''}))
			}
			if (start.form)
				listen(start.form, 'reset', (event) => {
					clearTimeout(resetTimer)
					resetTimer = setTimeout(() => {
						if (!disposed && !event.defaultPrevented) {
							current = {...config.value!}
							draftError = false
							calendar.setValue(dateValues(current))
							update()
						}
					}, 0)
				})
			const unsubscribe = calendar.subscribe(update)
			controller.mount()
			trigger.hidden = false
			return {
				destroy() {
					disposed = true
					clearTimeout(resetTimer)
					for (const remove of cleanups) remove()
					unsubscribe()
					controller.destroy()
					calendar.destroy()
					trigger.hidden = true
				}
			}
		},
		scope
	)
