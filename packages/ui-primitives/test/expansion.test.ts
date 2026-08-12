// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
	createAccordionController,
	createCheckboxController,
	createComboboxController,
	createFieldController,
	createFormController,
	createLayerController,
	createMenuController,
	createMultiSelectController,
	createRadioGroupController,
	createSliderController,
	createTabsController,
	createTooltipController,
	snapshotSelectOptions
} from '../src/index'

beforeEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		callback(0)
		return 1
	})
	globalThis.ResizeObserver ??= class {
		observe() {}
		disconnect() {}
		unobserve() {}
	} as unknown as typeof ResizeObserver
})

describe('menu controller', () => {
	it('opens once, reports state, and focuses the first item after the scheduled frame', () => {
		document.body.innerHTML = `
			<button id="trigger" type="button">Open</button>
			<div id="menu" role="menu"><button id="first" role="menuitem">First</button></div>
		`
		const trigger = document.getElementById('trigger') as HTMLButtonElement
		const menu = document.getElementById('menu') as HTMLElement
		const item = document.getElementById('first') as HTMLButtonElement
		let scheduled: FrameRequestCallback | undefined
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			scheduled = callback
			return 9
		})
		const onOpenChange = vi.fn()
		const controller = createMenuController({
			getTrigger: () => trigger,
			getMenu: () => menu,
			getItems: () => [item],
			onOpenChange
		})

		controller.mount()
		controller.open()
		controller.open()
		expect(controller.getState().open).toBe(true)
		expect(trigger.getAttribute('aria-expanded')).toBe('true')
		expect(onOpenChange).toHaveBeenCalledOnce()
		expect(onOpenChange).toHaveBeenLastCalledWith(true)
		scheduled?.(0)
		expect(document.activeElement).toBe(item)
		controller.destroy()
	})

	it('does not let pending open autofocus override immediate keyboard navigation', () => {
		document.body.innerHTML = `
			<button id="trigger" type="button">Open</button>
			<div id="menu" role="menu">
				<button id="first" role="menuitem">First</button>
				<button id="last" role="menuitem">Last</button>
			</div>
		`
		const trigger = document.getElementById('trigger') as HTMLButtonElement
		const menu = document.getElementById('menu') as HTMLElement
		const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
		const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame')
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 17)
		const controller = createMenuController({
			getTrigger: () => trigger,
			getMenu: () => menu,
			getItems: () => items
		})

		controller.mount()
		trigger.click()
		menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true, cancelable: true}))

		expect(cancelAnimationFrame).toHaveBeenCalledWith(17)
		expect(document.activeElement).toBe(items[1])
		controller.destroy()
	})
})

describe('field and form controllers', () => {
	it('cancels stale async validation and keeps the latest result', async() => {
		const resolvers: Array<(value: {message: string} | null) => void> = []
		const field = createFieldController({
			value: '',
			validateOn: ['input'],
			rules: [
				(_value, {signal}) =>
					new Promise((resolve) => {
						resolvers.push((result) => resolve(signal.aborted ? null : result))
					})
			]
		})
		const first = field.setValue('first')
		const second = field.setValue('second')
		resolvers[0]?.({message: 'stale'})
		resolvers[1]?.(null)
		await Promise.all([first, second])
		expect(field.getState()).toMatchObject({value: 'second', valid: true, pending: false})
	})

	it('supports cross-field submission and extracted submit methods', async() => {
		const email = createFieldController({
			value: '',
			rules: [(value) => (value ? null : {message: 'Required'})]
		})
		const form = createFormController({email: ''})
		form.register('email', email)
		const submit = form.submit
		expect(await submit(vi.fn())).toBe(false)
		await email.setValue('a@example.test')
		const handler = vi.fn()
		expect(await submit(handler)).toBe(true)
		expect(handler).toHaveBeenCalledWith({email: 'a@example.test'})
	})

	it('lets submit await the latest validation when blur validation overlaps', async() => {
		const resolvers: Array<(issue: null) => void> = []
		const field = createFieldController({
			value: 'Ada',
			rules: [() => new Promise<null>((resolve) => resolvers.push(resolve))]
		})
		const form = createFormController({name: 'Ada'})
		form.register('name', field)
		field.setTouched()
		const handler = vi.fn()
		const submission = form.submit(handler)
		resolvers[0]?.(null)
		resolvers[1]?.(null)
		expect(await submission).toBe(true)
		expect(handler).toHaveBeenCalledOnce()
	})

	it('treats equal object snapshots as not dirty', async() => {
		const field = createFieldController({value: {name: 'Ada'}})
		await field.setValue({name: 'Ada'})
		expect(field.getState().dirty).toBe(false)
	})

	it('projects native HTML constraints into deterministic issues', async() => {
		document.body.innerHTML = '<input required>'
		const input = document.querySelector('input')!
		const field = createFieldController({value: '', getElement: () => input})
		expect(await field.validate()).toBe(false)
		expect(field.getState().issues).toEqual([
			{code: 'native_required', message: 'This field is required.'}
		])
	})
})

describe('form controls', () => {
	it('projects checkbox state to native forms and reset', () => {
		document.body.innerHTML = '<form><label data-part="root"><input type="checkbox"></label></form>'
		const input = document.querySelector('input')!
		const controller = createCheckboxController({defaultChecked: true, getInput: () => input})
		controller.mount()
		expect(input.checked).toBe(true)
		input.checked = false
		input.dispatchEvent(new Event('change'))
		expect(controller.getState().checked).toBe(false)
		input.form?.dispatchEvent(new Event('reset'))
		expect(controller.getState().checked).toBe(true)
	})

	it('uses roving focus and skips disabled radio options', () => {
		document.body.innerHTML =
			'<div><input value="a"><input value="b" disabled><input value="c"></div>'
		const root = document.querySelector('div')!
		const inputs = [...root.querySelectorAll('input')]
		const controller = createRadioGroupController({
			options: [
				{value: 'a', label: 'A'},
				{value: 'b', label: 'B', disabled: true},
				{value: 'c', label: 'C'}
			],
			value: 'a',
			getRoot: () => root,
			getInputs: () => inputs
		})
		controller.mount()
		inputs[0]!.dispatchEvent(
			new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true})
		)
		expect(controller.getState().value).toBe('c')
	})
})

describe('layers and collection controls', () => {
	it('opens tooltips when a nested interactive child receives focus', () => {
		vi.useFakeTimers()
		document.body.innerHTML =
			'<span id="trigger"><button id="child" aria-describedby="existing">Help</button></span><span id="tooltip" role="tooltip" hidden></span>'
		const trigger = document.querySelector<HTMLElement>('#trigger')!
		const tooltip = document.querySelector<HTMLElement>('#tooltip')!
		const controller = createTooltipController({
			openDelayMs: 0,
			closeDelayMs: 0,
			getTrigger: () => trigger,
			getTooltip: () => tooltip
		})
		controller.mount()
		const child = document.querySelector<HTMLButtonElement>('#child')!
		expect(child.getAttribute('aria-describedby')).toBe('existing tooltip')
		expect(trigger.getAttribute('aria-describedby')).toBeNull()
		child.dispatchEvent(
			new FocusEvent('focusin', {bubbles: true})
		)
		vi.runAllTimers()
		expect(controller.getState().open).toBe(true)
		expect(tooltip.hidden).toBe(false)
		controller.destroy()
		expect(child.getAttribute('aria-describedby')).toBe('existing')
		vi.useRealTimers()
	})

	it('takes deeply frozen option snapshots and rejects accessors', () => {
		const metadata = {group: {id: 'a'}}
		const source = [{value: 'a', label: 'Alpha', metadata}]
		const snapshot = snapshotSelectOptions(source)
		source[0]!.label = 'Changed'
		metadata.group.id = 'changed'
		expect(snapshot[0]).toMatchObject({label: 'Alpha', metadata: {group: {id: 'a'}}})
		expect(Object.isFrozen((snapshot[0]!.metadata as typeof metadata).group)).toBe(true)
		expect(() =>
			snapshotSelectOptions([
				Object.defineProperty({value: 'bad'}, 'label', {get: () => 'Bad'}) as {
					value: string
					label: string
				}
			])
		).toThrow('must be a data property')
	})

	it('only dismisses the topmost nested layer on Escape', () => {
		document.body.innerHTML =
			'<button id="a"></button><div id="l1"></div><button id="b"></button><div id="l2"></div>'
		const first = createLayerController({
			getAnchor: () => document.querySelector('#a'),
			getLayer: () => document.querySelector('#l1')
		})
		const second = createLayerController({
			getAnchor: () => document.querySelector('#b'),
			getLayer: () => document.querySelector('#l2')
		})
		first.mount()
		second.mount()
		first.open()
		second.open()
		document.dispatchEvent(
			new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})
		)
		expect(second.isOpen()).toBe(false)
		expect(first.isOpen()).toBe(true)
		first.destroy()
		second.destroy()
	})

	it('uses latest-result-wins for async combobox options', async() => {
		document.body.innerHTML =
			'<div id="root"><input id="input"><input id="native"></div><div id="list"></div>'
		const pending: Array<(entries: Array<{value: string; label: string}>) => void> = []
		const controller = createComboboxController({
			loadOptions: (_query, {signal}) =>
				new Promise((resolve) => pending.push((entries) => resolve(signal.aborted ? [] : entries))),
			debounceMs: 0,
			getRoot: () => document.querySelector('#root'),
			getInput: () => document.querySelector('#input'),
			getListbox: () => document.querySelector('#list'),
			getOptions: () => [],
			getNativeInput: () => document.querySelector('#native')
		})
		controller.mount()
		controller.setQuery('a')
		controller.setQuery('b')
		pending[0]?.([{value: 'a', label: 'A'}])
		pending[1]?.([{value: 'b', label: 'B'}])
		await Promise.resolve()
		await Promise.resolve()
		expect(controller.getState().options.map((entry) => entry.value)).toEqual(['b'])
	})

	it('enforces multi-select limits and immutable values', () => {
		document.body.innerHTML =
			'<div id="root"><input></div><div id="list"><div data-option-index="0"></div><div data-option-index="1"></div></div>'
		const controller = createMultiSelectController({
			options: [
				{value: 'a', label: 'A'},
				{value: 'b', label: 'B'}
			],
			maxSelected: 1,
			getRoot: () => document.querySelector('#root'),
			getInput: () => document.querySelector('input'),
			getListbox: () => document.querySelector('#list'),
			getOptions: () => [...document.querySelectorAll('#list > div')] as HTMLElement[]
		})
		controller.mount()
		controller.toggleValue('a')
		controller.toggleValue('b')
		expect(controller.getState().values).toEqual(['a'])
		expect(Object.isFrozen(controller.getState().values)).toBe(true)
	})
})

describe('navigation and range', () => {
	it('updates tabs and accordion ARIA state', () => {
		document.body.innerHTML =
			'<div id="tabs"><button data-tab data-value="a"></button><button data-tab data-value="b"></button></div><div id="panels"><div data-value="a"></div><div data-value="b"></div></div><div data-accordion-root><button data-accordion-trigger data-value="x"></button><div data-value="x"></div></div>'
		const tabs = [...document.querySelectorAll('#tabs button')] as HTMLElement[]
		const panels = [...document.querySelectorAll('#panels div')] as HTMLElement[]
		const tabController = createTabsController({
			activeId: 'a',
			getTabs: () => tabs,
			getPanels: () => panels
		})
		tabController.mount()
		tabController.setActive('b')
		expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
		const trigger = document.querySelector('[data-accordion-trigger]') as HTMLElement
		const panel = trigger.nextElementSibling as HTMLElement
		const accordion = createAccordionController({
			getTriggers: () => [trigger],
			getPanels: () => [panel]
		})
		accordion.mount()
		accordion.toggle('x')
		expect(trigger.getAttribute('aria-expanded')).toBe('true')
	})

	it('supports pointer projection for dual sliders', () => {
		document.body.innerHTML =
			'<div id="slider"><button data-part="thumb"></button><button data-part="thumb"></button><input><input></div>'
		const root = document.querySelector('#slider') as HTMLElement
		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
			left: 0,
			right: 100,
			top: 0,
			bottom: 10,
			width: 100,
			height: 10,
			x: 0,
			y: 0,
			toJSON: () => ({})
		})
		const controller = createSliderController({
			value: [20, 80],
			getRoot: () => root,
			getThumbs: () => [...root.querySelectorAll('button')],
			getInputs: () => [...root.querySelectorAll('input')]
		})
		controller.mount()
		root.dispatchEvent(
			new PointerEvent('pointerdown', {clientX: 30, clientY: 5, button: 0, bubbles: true})
		)
		expect(controller.getState().value).toEqual([30, 80])
	})
})
