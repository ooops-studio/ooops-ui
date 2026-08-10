// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
	dispatchUiEvent,
	enabledIndices,
	isBrowser,
	isNodeInside,
	nextEnabledIndex,
	nextFrame
} from '../src/dom'
import {
	createAccordionController,
	createCheckboxController,
	createComboboxController,
	createDialogController,
	createFieldController,
	createFormController,
	createInputController,
	createLayerController,
	createMenuController,
	createMultiSelectController,
	createNumberInputController,
	createPopoverController,
	createRadioGroupController,
	createSegmentedControlController,
	createSelectController,
	createSliderController,
	createSwitchController,
	createTabsController,
	createTextareaController,
	createTooltipController,
	dialogTransitionDuration,
	formatUiMessage,
	resolveUiMessages
} from '../src/index'

beforeEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
	vi.useRealTimers()
	window.requestAnimationFrame ??= (callback) => window.setTimeout(() => callback(0), 0)
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		callback(0)
		return 1
	})
	globalThis.ResizeObserver = class {
		observe() {}
		disconnect() {}
		unobserve() {}
	} as unknown as typeof ResizeObserver
})

describe('DOM and message contracts', () => {
	it('covers browser guards, events and enabled-index boundaries', () => {
		expect(isBrowser()).toBe(true)
		const frame = vi.fn()
		expect(nextFrame(frame)).toBe(1)
		expect(frame).toHaveBeenCalledOnce()

		document.body.innerHTML = '<div id="root"><span id="child"></span></div>'
		const root = document.querySelector('#root')!
		const child = document.querySelector('#child')!
		expect(isNodeInside(child, [null, root])).toBe(true)
		expect(isNodeInside(null, [root])).toBe(false)
		const listener = vi.fn()
		root.addEventListener('ui:test', listener)
		dispatchUiEvent(root, 'ui:test', {ok: true})
		dispatchUiEvent(null, 'ui:test', {ok: false})
		expect(listener).toHaveBeenCalledOnce()
		expect((listener.mock.calls[0]![0] as CustomEvent).detail).toEqual({ok: true})

		const entries = [{}, {disabled: true}, {}]
		expect(enabledIndices(entries)).toEqual([0, 2])
		expect(nextEnabledIndex([], 0, 1)).toBe(-1)
		expect(nextEnabledIndex(entries, 1, 1)).toBe(0)
		expect(nextEnabledIndex(entries, 1, -1)).toBe(2)
		expect(nextEnabledIndex(entries, 0, 1)).toBe(2)
		expect(nextEnabledIndex(entries, 2, 1)).toBe(0)
		expect(nextEnabledIndex(entries, 2, 1, false)).toBe(2)
		expect(nextEnabledIndex(entries, 0, -1)).toBe(2)
	})

	it('resolves immutable overrides and preserves unknown message placeholders', () => {
		const defaults = resolveUiMessages()
		const custom = resolveUiMessages({clear: 'Καθαρισμός', removeItem: 'Remove {label} from {area}'})
		expect(Object.isFrozen(defaults)).toBe(true)
		expect(custom.clear).toBe('Καθαρισμός')
		expect(custom.confirm).toBe('Confirm')
		expect(formatUiMessage(custom.removeItem, {label: 'Alpha'})).toBe('Remove Alpha from {area}')
	})
})

describe('navigation controller coverage', () => {
	it('supports automatic, manual, navigation and dynamic tab contracts', () => {
		document.body.innerHTML = `
			<div id="tabs">
				<button data-tab data-value="a">A</button>
				<button data-tab data-value="b" aria-disabled="true">B</button>
				<button data-tab id="c">C</button>
			</div>
			<div id="panels"><section data-value="a"></section><section data-value="c"></section></div>
		`
		const root = document.querySelector<HTMLElement>('#tabs')!
		const getTabs = () => [...root.querySelectorAll<HTMLElement>('[data-tab]')]
		const panels = [...document.querySelectorAll<HTMLElement>('#panels > *')]
		const onChange = vi.fn()
		const tabs = createTabsController({
			activeId: 'a',
			getTabs,
			getPanels: () => panels,
			onChange
		})
		tabs.mount()
		tabs.mount()
		getTabs()[0]!.click()
		root.dispatchEvent(new MouseEvent('click', {bubbles: true}))
		root.dispatchEvent(new KeyboardEvent('keydown', {key: 'x', bubbles: true}))
		getTabs()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))
		expect(tabs.getState().activeId).toBe('c')
		getTabs()[2]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}))
		expect(tabs.getState().activeId).toBe('a')
		getTabs()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}))
		expect(document.activeElement).toBe(getTabs()[2])
		getTabs()[2]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))
		expect(document.activeElement).toBe(getTabs()[0])

		tabs.configure({mode: 'navigation', activation: 'manual', orientation: 'vertical', loop: false})
		getTabs()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))
		expect(tabs.getState().activeId).toBe('a')
		getTabs()[2]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))
		expect(tabs.getState().activeId).toBe('c')
		expect(getTabs()[2]!.getAttribute('aria-current')).toBe('page')
		getTabs()[0]!.click()
		expect(tabs.getState().activeId).toBe('a')
		tabs.configure({})
		tabs.setActive('missing', true)
		expect(tabs.getState().activeId).toBe('a')
		root.replaceChildren()
		tabs.refresh()
		expect(tabs.getState().activeId).toBe('')
		tabs.destroy()

		const missing = createTabsController({activeId: '', getTabs: () => []})
		missing.mount()
		missing.destroy()
	})

	it('supports single and multiple accordions with keyboard navigation', () => {
		document.body.innerHTML = `
			<div data-accordion-root>
				<button data-accordion-trigger data-value="a">A</button>
				<button data-accordion-trigger data-value="b" disabled>B</button>
				<button data-accordion-trigger id="c">C</button>
				<section data-value="a"></section><section data-value="b"></section><section data-value="c"></section>
			</div>
		`
		const root = document.querySelector<HTMLElement>('[data-accordion-root]')!
		const triggers = () => [...root.querySelectorAll<HTMLElement>('[data-accordion-trigger]')]
		const panels = () => [...root.querySelectorAll<HTMLElement>('section')]
		const onChange = vi.fn()
		const single = createAccordionController({
			defaultOpenIds: ['a', 'c'],
			collapsible: false,
			getTriggers: triggers,
			getPanels: panels,
			onChange
		})
		single.mount()
		single.mount()
		root.dispatchEvent(new KeyboardEvent('keydown', {key: 'x', bubbles: true}))
		triggers()[0]!.click()
		expect(single.getState().openIds).toEqual(['a'])
		triggers()[2]!.click()
		expect(single.getState().openIds).toEqual(['c'])
		for (const key of ['Home', 'End', 'ArrowDown', 'ArrowUp']) {
			triggers()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
		}
		single.setOpenIds(['a'], true)
		expect(onChange).toHaveBeenCalled()
		single.destroy()

		const multiple = createAccordionController({
			type: 'multiple',
			defaultOpenIds: ['a', 'a'],
			getTriggers: triggers,
			getPanels: panels
		})
		multiple.mount()
		multiple.toggle('c')
		expect(multiple.getState().openIds).toEqual(['a', 'c'])
		multiple.toggle('a')
		expect(multiple.getState().openIds).toEqual(['c'])
		multiple.destroy()
	})
})

describe('dialog and popover controller coverage', () => {
	it('covers fallback-dialog, busy, cancel, backdrop and custom event behavior', async() => {
		document.body.innerHTML = '<button id="restore"></button><div id="root"><div id="dialog" hidden><button id="initial"></button></div></div>'
		const root = document.querySelector<HTMLElement>('#root')!
		const dialog = document.querySelector<HTMLElement>('#dialog')!
		const onOpenChange = vi.fn()
		const onClose = vi.fn()
		const closeEvent = vi.fn()
		const confirmEvent = vi.fn()
		root.addEventListener('custom:close', closeEvent)
		root.addEventListener('custom:confirm', confirmEvent)
		const controller = createDialogController({
			open: true,
			getRoot: () => root,
			getDialog: () => dialog,
			getInitialFocus: () => document.querySelector('#initial'),
			getRestoreFocusTo: () => document.querySelector('#restore'),
			onOpenChange,
			onClose,
			onConfirm: vi.fn(),
			eventNames: {close: 'custom:close', confirm: 'custom:confirm'}
		})
		controller.mount()
		expect(controller.getState()).toMatchObject({open: true, mounted: true})
		controller.setBusy(true)
		controller.close()
		expect(controller.getState().open).toBe(true)
		await controller.confirm()
		expect(confirmEvent).not.toHaveBeenCalled()
		controller.setBusy(false)
		dialog.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		expect(controller.getState().closeReason).toBe('backdrop')
		expect(closeEvent).toHaveBeenCalledOnce()
		controller.toggle()
		await controller.confirm()
		expect(confirmEvent).toHaveBeenCalledOnce()
		expect(controller.getState().closeReason).toBe('confirm')
		controller.toggle()
		controller.toggle()
		controller.destroy()
		controller.destroy()
		expect(onOpenChange).toHaveBeenCalledWith(true)
		expect(onClose).toHaveBeenCalled()
		expect(dialogTransitionDuration(120)).toBeGreaterThanOrEqual(0)
	})

	it('covers native cancel/close and opted-out close policies', () => {
		document.body.innerHTML = '<div id="root"><dialog id="dialog"></dialog></div>'
		const root = document.querySelector<HTMLElement>('#root')!
		const dialog = document.querySelector<HTMLDialogElement>('dialog')!
		dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''))
		dialog.close = vi.fn((reason?: string) => {
			dialog.returnValue = reason ?? ''
			dialog.removeAttribute('open')
			dialog.dispatchEvent(new Event('close'))
		})
		const controller = createDialogController({
			closeOnEscape: false,
			closeOnBackdrop: false,
			modal: false,
			getRoot: () => root,
			getDialog: () => dialog
		})
		controller.mount()
		controller.open()
		dialog.dispatchEvent(new Event('cancel', {cancelable: true}))
		dialog.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		expect(controller.getState().open).toBe(true)
		controller.close('cancel')
		expect(controller.getState().closeReason).toBe('cancel')
		controller.destroy()

		const missing = createDialogController({getRoot: () => null, getDialog: () => null})
		missing.mount()
		missing.open()
		missing.close()
		missing.destroy()
	})

	it('covers popover focus, toggle, outside dismissals and missing DOM', () => {
		document.body.innerHTML = '<div id="root"><button id="anchor"></button></div><div id="panel"><button id="inside"></button></div><button id="outside"></button>'
		const root = document.querySelector<HTMLElement>('#root')!
		const anchor = document.querySelector<HTMLElement>('#anchor')!
		const panel = document.querySelector<HTMLElement>('#panel')!
		vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 10, 50, 20))
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 80, 40))
		const onOpenChange = vi.fn()
		const onClose = vi.fn()
		const controller = createPopoverController({
			open: true,
			placement: 'top',
			align: 'end',
			offset: 4,
			viewportPadding: 2,
			zIndex: 5,
			closeOnOutsidePointer: true,
			closeOnOutsideFocus: true,
			focusOnOpen: true,
			trapFocus: true,
			getRoot: () => root,
			getAnchor: () => anchor,
			getPanel: () => panel,
			getInitialFocus: () => document.querySelector('#inside'),
			onOpenChange,
			onClose
		})
		controller.mount()
		controller.mount()
		controller.updatePosition()
		document.querySelector('#outside')!.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
		expect(controller.getState().open).toBe(false)
		controller.open()
		controller.open()
		controller.toggle()
		controller.close()
		controller.toggle()
		document.querySelector('#outside')!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		expect(onOpenChange).toHaveBeenCalled()
		expect(onClose).toHaveBeenCalled()
		controller.destroy()
		controller.destroy()

		const missing = createPopoverController({
			getRoot: () => null,
			getAnchor: () => null,
			getPanel: () => null,
			isTargetInside: () => true
		})
		missing.mount()
		missing.open()
		missing.close()
		missing.destroy()
	})
})

describe('combobox controller coverage', () => {
	const fixture = () => {
		document.body.innerHTML = `
			<div id="root"><input id="input"><input id="native"></div>
			<div id="list"><button id="option-0" data-option-index="0"></button><button id="option-1" data-option-index="1"></button></div>
		`
		return {
			root: document.querySelector<HTMLElement>('#root')!,
			input: document.querySelector<HTMLInputElement>('#input')!,
			native: document.querySelector<HTMLInputElement>('#native')!,
			list: document.querySelector<HTMLElement>('#list')!,
			items: [...document.querySelectorAll<HTMLElement>('[data-option-index]')]
		}
	}

	it('covers filtering, event navigation, custom values and reactive options', () => {
		const f = fixture()
		const onChange = vi.fn()
		const onQueryChange = vi.fn()
		const controller = createComboboxController({
			options: [{value: 'a', label: 'Alpha', disabled: true}, {value: 'b', label: 'Beta'}],
			defaultValue: 'b',
			portal: false,
			filter: (option, query) => option.label.startsWith(query),
			getRoot: () => f.root,
			getInput: () => f.input,
			getNativeInput: () => f.native,
			getListbox: () => f.list,
			getOptions: () => f.items,
			onChange,
			onQueryChange
		})
		controller.mount()
		controller.mount()
		expect(f.input.value).toBe('')
		f.input.dispatchEvent(new FocusEvent('focus'))
		controller.move(1)
		controller.move(-1)
		f.input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))
		f.input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))
		expect(controller.getState().value).toBe('b')
		controller.setQuery('B', false)
		expect(onQueryChange).toHaveBeenCalledWith('B')
		controller.commit(0)
		controller.setAllowCustomValue(true)
		controller.setQuery(' Custom ', false)
		controller.commit(-1)
		expect(controller.getState().value).toBe('Custom')
		f.input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
		f.input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}))
		f.list.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		f.items[1]!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		controller.setDisabled(true)
		controller.open()
		controller.setDisabled(false)
		controller.setOptions([{value: 'b', label: 'Beta'}])
		controller.setAllowCustomValue(false)
		expect(controller.getState().value).toBe('')
		controller.setValue('missing')
		controller.destroy()

		const missing = createComboboxController({
			getRoot: () => null,
			getInput: () => null,
			getListbox: () => null,
			getOptions: () => []
		})
		missing.mount()
		missing.destroy()
	})

	it('covers debounced async success, failure and stale-load cancellation', async() => {
		vi.useFakeTimers()
		const f = fixture()
		const loads = vi.fn(async(query: string) => {
			if (query === 'fail') throw 'failure'
			return [{value: query, label: query.toUpperCase()}]
		})
		const controller = createComboboxController({
			loadOptions: loads,
			debounceMs: 10,
			getRoot: () => f.root,
			getInput: () => f.input,
			getListbox: () => f.list,
			getOptions: () => f.items
		})
		controller.mount()
		controller.setQuery('a')
		controller.setQuery('b')
		await vi.advanceTimersByTimeAsync(10)
		await Promise.resolve()
		expect(loads).toHaveBeenLastCalledWith('b', expect.any(Object))
		expect(controller.getState().loading).toBe(false)
		controller.setQuery('fail')
		await vi.advanceTimersByTimeAsync(10)
		await Promise.resolve()
		expect(controller.getState().error).toBe('Unable to load options.')
		controller.destroy()
	})
})

describe('native form controller coverage', () => {
	it('covers input form reset, pre-mount values, emissions and missing elements', () => {
		document.body.innerHTML = '<form><input id="input" value="server"></form>'
		const input = document.querySelector<HTMLInputElement>('#input')!
		const onValueChange = vi.fn()
		const controller = createInputController({
			value: 'controlled',
			defaultValue: 'default',
			getElement: () => input,
			onValueChange
		})
		controller.mount()
		controller.mount()
		controller.setValue('next', true)
		expect(onValueChange).toHaveBeenCalledWith('next')
		input.value = 'typed'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		expect(controller.getState().value).toBe('typed')
		input.form!.dispatchEvent(new Event('reset'))
		expect(controller.getState().value).toBe('default')
		controller.reset()
		controller.destroy()
		controller.destroy()

		const missing = createInputController({getElement: () => null})
		missing.mount()
		missing.setValue('safe')
		missing.destroy()
	})

	it('covers textarea resize bounds and no-op modes', () => {
		document.body.innerHTML = '<textarea id="area" rows="2" style="line-height: 10px; border-top-width: 1px; border-bottom-width: 1px"></textarea>'
		const area = document.querySelector<HTMLTextAreaElement>('#area')!
		Object.defineProperty(area, 'scrollHeight', {configurable: true, value: 100})
		const controller = createTextareaController({
			autoResize: true,
			minRows: 3,
			maxRows: 5,
			getElement: () => area
		})
		controller.mount()
		expect(area.style.height).toBe('52px')
		expect(area.style.overflowY).toBe('auto')
		controller.setValue('content')
		controller.resize()
		controller.destroy()

		const inert = createTextareaController({autoResize: false, getElement: () => area})
		expect(() => inert.resize()).not.toThrow()
		const missing = createTextareaController({autoResize: true, getElement: () => null})
		expect(() => missing.resize()).not.toThrow()
	})

	it('covers checkbox, switch and delegated choice keyboard paths', () => {
		document.body.innerHTML = `
			<form><label data-part="root"><input id="check" type="checkbox"></label></form>
			<div id="radios"><input type="radio" value="a"><input type="radio" value="b"><input type="radio" value="c"></div>
			<div id="segments"><button value="a"></button><button value="b"></button></div>
		`
		const check = document.querySelector<HTMLInputElement>('#check')!
		const checkbox = createCheckboxController({checked: true, getInput: () => check})
		checkbox.mount()
		checkbox.mount()
		checkbox.setIndeterminate(true)
		checkbox.setDisabled(true)
		checkbox.reset()
		checkbox.destroy()

		const switchController = createSwitchController({getInput: () => check})
		switchController.mount()
		expect(check.getAttribute('role')).toBe('switch')
		switchController.destroy()
		const missingSwitch = createSwitchController({getInput: () => null})
		missingSwitch.mount()

		const radioRoot = document.querySelector<HTMLElement>('#radios')!
		const radioInputs = () => [...radioRoot.querySelectorAll<HTMLInputElement>('input')]
		const onRadio = vi.fn()
		const radio = createRadioGroupController({
			options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B', disabled: true}, {value: 'c', label: 'C'}],
			getRoot: () => radioRoot,
			getInputs: radioInputs,
			onChange: onRadio
		})
		radio.mount()
		radio.setValue('missing' as 'a')
		for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'])
			radioInputs()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
		radioInputs()[2]!.checked = true
		radioInputs()[2]!.dispatchEvent(new Event('change', {bubbles: true}))
		radioRoot.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}))
		radio.setOptions([])
		radio.destroy()

		const segmentRoot = document.querySelector<HTMLElement>('#segments')!
		const segments = () => [...segmentRoot.querySelectorAll<HTMLButtonElement>('button')]
		const segmented = createSegmentedControlController({
			options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}],
			getRoot: () => segmentRoot,
			getInputs: segments
		})
		segmented.mount()
		segments()[1]!.click()
		expect(segmented.getState().value).toBe('b')
		segmented.destroy()
	})
})

describe('multi-select controller coverage', () => {
	it('covers filtering, navigation, option/chip events and reactive constraints', () => {
		document.body.innerHTML = `
			<div id="multi"><input id="input"><button data-remove-value="a"></button></div>
			<div id="list"><button id="o0" data-option-index="0"></button><button id="o1" data-option-index="1"></button></div>
			<div id="chips"><span data-value="a"></span><span data-value="b"></span></div>
		`
		const root = document.querySelector<HTMLElement>('#multi')!
		const input = document.querySelector<HTMLInputElement>('#input')!
		const list = document.querySelector<HTMLElement>('#list')!
		const items = () => [...list.querySelectorAll<HTMLElement>('[data-option-index]')]
		const onChange = vi.fn()
		const controller = createMultiSelectController({
			options: [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta', disabled: true}],
			defaultValues: ['a'],
			filter: (option, query) => option.label.toLowerCase().includes(query),
			getRoot: () => root,
			getInput: () => input,
			getListbox: () => list,
			getOptions: items,
			getChips: () => [...document.querySelectorAll<HTMLElement>('#chips > *')],
			onChange
		})
		controller.mount()
		controller.mount()
		input.dispatchEvent(new FocusEvent('focus'))
		controller.move(1)
		controller.move(-1)
		input.value = 'alp'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape'])
			input.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
		input.value = ''
		input.dispatchEvent(new Event('input', {bubbles: true}))
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Backspace', bubbles: true}))
		list.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		items()[0]!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		root.dispatchEvent(new MouseEvent('click', {bubbles: true}))
		root.querySelector<HTMLElement>('[data-remove-value]')!.click()
		controller.toggleValue('missing' as 'a')
		controller.toggleValue('b')
		controller.setDisabled(true)
		controller.open()
		controller.setDisabled(false)
		controller.open()
		controller.close()
		controller.setMaxSelected(undefined)
		controller.setMaxSelected(1)
		controller.setOptions([{value: 'a', label: 'Alpha'}])
		controller.selectAll()
		controller.clear()
		controller.destroy()

		const missing = createMultiSelectController({
			options: [],
			getRoot: () => null,
			getInput: () => null,
			getListbox: () => null,
			getOptions: () => []
		})
		missing.mount()
		missing.destroy()
		expect(onChange).toHaveBeenCalled()
	})
})

describe('select controller coverage', () => {
	const selectFixture = () => {
		document.body.innerHTML = `
			<form><div id="root"><button id="trigger" type="button"></button><select id="native"><option value=""></option><option value="a">A</option><option value="b">B</option></select></div>
			<div id="list"><button id="option-a" data-ooops-select-option data-option-index="0"></button><button id="option-b" data-ooops-select-option data-option-index="1"></button></div></form>
		`
		return {
			root: document.querySelector<HTMLElement>('#root')!,
			trigger: document.querySelector<HTMLElement>('#trigger')!,
			list: document.querySelector<HTMLElement>('#list')!,
			native: document.querySelector<HTMLSelectElement>('#native')!
		}
	}

	it('covers option snapshots, every interaction route and reactive state', () => {
		expect(() => createSelectController({
			options: [{value: 'a', label: 'A', metadata: {bad: () => undefined}}],
			getRoot: () => null, getTrigger: () => null, getListbox: () => null
		})).toThrow('structured-cloneable')
		expect(() => createSelectController({
			options: [{value: 1, label: 'A'} as never],
			getRoot: () => null, getTrigger: () => null, getListbox: () => null
		})).toThrow('string value')

		vi.useFakeTimers()
		const f = selectFixture()
		vi.spyOn(f.trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 20))
		vi.spyOn(f.list, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 80, 60))
		const onChange = vi.fn()
		const onOpenChange = vi.fn()
		const controller = createSelectController({
			options: [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta', disabled: true}],
			defaultValue: 'a',
			allowEmpty: false,
			loop: false,
			viewportPadding: 4,
			maxHeight: 120,
			minWidth: 140,
			getRoot: () => f.root,
			getTrigger: () => f.trigger,
			getListbox: () => f.list,
			getNativeSelect: () => f.native,
			onChange,
			onOpenChange
		})
		controller.mount()
		controller.mount()
		controller.updatePosition()
		controller.setValue('missing' as 'a')
		controller.setValue('')
		controller.setActiveIndex(-1)
		controller.setActiveIndex(1)
		f.trigger.click()
		for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab', 'a', 'a'])
			f.trigger.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
		vi.runOnlyPendingTimers()
		f.list.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		f.list.dispatchEvent(new PointerEvent('pointermove', {bubbles: true}))
		f.list.querySelector<HTMLElement>('[data-option-index="0"]')!.dispatchEvent(new PointerEvent('pointermove', {bubbles: true}))
		f.list.querySelector<HTMLElement>('[data-option-index="0"]')!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		f.native.value = 'b'
		f.native.dispatchEvent(new Event('change', {bubbles: true}))
		f.native.value = 'a'
		f.native.dispatchEvent(new Event('change', {bubbles: true}))
		f.native.form!.dispatchEvent(new Event('reset'))
		controller.toggle()
		controller.toggle()
		controller.close({focusTrigger: true})
		controller.setOptions([{value: 'b', label: 'Beta'}])
		controller.setAllowEmpty(false)
		controller.setDisabled(true)
		controller.setDisabled(false)
		controller.destroy()
		controller.destroy()
		expect(onChange).toHaveBeenCalled()
		expect(onOpenChange).toHaveBeenCalled()

		const missing = createSelectController({
			options: [],
			getRoot: () => null,
			getTrigger: () => null,
			getListbox: () => null
		})
		missing.mount()
		missing.destroy()
	})
})

describe('validation controller coverage', () => {
	it('covers schema, rules, external issues, reset, disabled and focus behavior', async() => {
		document.body.innerHTML = '<input id="field" required>'
		const element = document.querySelector<HTMLInputElement>('#field')!
		const onChange = vi.fn()
		const schema = {
			'~standard': {
				version: 1 as const,
				vendor: 'test',
				validate: vi.fn(async(value: string) => value === 'schema-bad'
					? {issues: [{message: 'Schema issue', path: ['field']}]}
					: {value})
			}
		}
		const field = createFieldController({
			value: '',
			validateOn: ['input', 'blur', 'submit'],
			schema,
			getValues: () => ({other: 1}),
			getElement: () => element,
			onChange,
			rules: [
				(value, context) => value === 'array' ? [{message: String(context.values.other)}] : null,
				(value) => value === 'throw' ? (() => { throw new Error('Thrown') })() : undefined
			]
		})
		expect(await field.validate()).toBe(false)
		element.value = 'ok'
		expect(await field.setValue('ok')).toBe(true)
		expect(await field.setValue('schema-bad')).toBe(false)
		expect(await field.setValue('array')).toBe(false)
		expect(await field.setValue('throw')).toBe(false)
		field.setExternalIssues([{message: 'Server'}])
		expect(field.getState().valid).toBe(false)
		field.setExternalIssues([])
		field.setTouched(false)
		field.setTouched()
		field.focus()
		expect(document.activeElement).toBe(element)
		field.setDisabled(true)
		expect(await field.validate()).toBe(true)
		field.setDisabled(false)
		field.reset('reset')
		expect(field.getState()).toMatchObject({value: 'reset', dirty: false, touched: false})
		field.destroy()
		expect(onChange).toHaveBeenCalled()
	})

	it('covers form replacement, invalid focus, reset, async submit and unregister', async() => {
		document.body.innerHTML = '<input id="first"><input id="second">'
		const firstElement = document.querySelector<HTMLElement>('#first')!
		const first = createFieldController({
			value: '',
			getElement: () => firstElement,
			rules: [(value) => value ? null : {message: 'Required'}]
		})
		const second = createFieldController({value: 'ok'})
		const form = createFormController({first: '', second: 'ok'})
		const unregister = form.register('first', first)
		form.register('second', second)
		form.register('second', second)
		expect(await form.validate()).toBe(false)
		form.focusFirstInvalid()
		expect(document.activeElement).toBe(firstElement)
		expect(await form.submit(vi.fn())).toBe(false)
		await first.setValue('ready')
		const handler = vi.fn(async() => Promise.resolve())
		expect(await form.submit(handler)).toBe(true)
		expect(form.getState().submitting).toBe(false)
		form.reset()
		unregister()
		form.destroy()
	})
})

describe('number, slider and layer branch coverage', () => {
	it('covers reactive number bounds, keyboard multipliers, reset and missing DOM', () => {
		document.body.innerHTML = '<button id="dec"></button><input id="number"><button id="inc"></button>'
		const input = document.querySelector<HTMLInputElement>('#number')!
		const onChange = vi.fn()
		const controller = createNumberInputController({
			defaultValue: 5,
			min: 0,
			max: 10,
			step: 0.5,
			getInput: () => input,
			getIncrement: () => document.querySelector('#inc'),
			getDecrement: () => document.querySelector('#dec'),
			onChange
		})
		controller.mount()
		controller.mount()
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', shiftKey: true, bubbles: true}))
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}))
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}))
		document.querySelector<HTMLElement>('#inc')!.click()
		document.querySelector<HTMLElement>('#dec')!.click()
		controller.configure({min: -5, max: 5, step: 1, clampOnBlur: true})
		input.value = '8'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		input.dispatchEvent(new FocusEvent('blur'))
		controller.reset()
		controller.destroy()
		expect(onChange).toHaveBeenCalled()

		const missing = createNumberInputController({getInput: () => null})
		missing.mount()
		missing.destroy()
	})

	it('covers slider orientation, pointer selection, configuration and guards', () => {
		document.body.innerHTML = '<div id="slider"><button data-thumb="0"></button><button data-thumb="1"></button><input><input></div>'
		const root = document.querySelector<HTMLElement>('#slider')!
		const thumbs = () => [...root.querySelectorAll<HTMLElement>('[data-thumb]')]
		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100))
		const controller = createSliderController({
			value: [20, 80],
			getRoot: () => root,
			getThumbs: thumbs,
			getInputs: () => [...root.querySelectorAll<HTMLInputElement>('input')]
		})
		controller.mount()
		controller.mount()
		root.dispatchEvent(new PointerEvent('pointerdown', {button: 1, clientX: 50, bubbles: true}))
		root.dispatchEvent(new PointerEvent('pointerdown', {button: 0, clientX: 90, bubbles: true}))
		controller.configure({orientation: 'vertical', direction: 'rtl', min: 0, max: 10, step: 1})
		root.dispatchEvent(new PointerEvent('pointerdown', {button: 0, clientY: 90, bubbles: true}))
		for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'x'])
			thumbs()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
		controller.setActiveThumb(1)
		controller.refresh()
		expect(() => controller.configure({minStepsBetweenThumbs: -1})).toThrow(RangeError)
		controller.destroy()

		const missing = createSliderController({getRoot: () => null, getThumbs: () => []})
		missing.mount()
		missing.destroy()
	})

	it('covers layer policy opt-outs, custom inside checks and portal restoration', () => {
		document.body.innerHTML = '<div id="host"><button id="anchor"></button><div id="layer"></div><span id="after"></span></div><div id="portal"></div><button id="outside"></button>'
		const anchor = document.querySelector<HTMLElement>('#anchor')!
		const layer = document.querySelector<HTMLElement>('#layer')!
		const host = document.querySelector<HTMLElement>('#host')!
		const portal = document.querySelector<HTMLElement>('#portal')!
		vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20, 20))
		vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20, 20))
		const controller = createLayerController({
			getAnchor: () => anchor,
			getLayer: () => layer,
			getDocument: () => document,
			getPortalRoot: () => portal,
			closeOnEscape: false,
			closeOnOutsidePointer: false,
			closeOnOutsideFocus: true,
			isTargetInside: (target) => target === anchor,
			matchAnchorWidth: true
		})
		controller.mount()
		controller.mount()
		controller.update()
		controller.open()
		controller.open()
		document.querySelector('#outside')!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		expect(controller.isOpen()).toBe(true)
		document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
		expect(controller.isOpen()).toBe(true)
		document.querySelector('#outside')!.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
		expect(controller.isOpen()).toBe(false)
		controller.destroy()
		expect(layer.parentElement).toBe(host)
	})
})

describe('menu and tooltip controller coverage', () => {
	it('covers menu item types, navigation, pointer, typeahead and submenu behavior', () => {
		vi.useFakeTimers()
		document.body.innerHTML = `
			<button id="trigger"></button>
			<div id="menu" role="menu">
				<button role="menuitem" data-value="plain" data-label="Plain">Plain</button>
				<button role="menuitem" aria-disabled="true">Disabled</button>
				<button role="menuitemcheckbox" aria-checked="false" data-keep-open="true">Check</button>
				<button role="menuitemradio" data-group="g" aria-checked="false">Radio A</button>
				<button role="menuitemradio" data-group="g" aria-checked="true">Radio B</button>
				<button id="owner" role="menuitem" aria-haspopup="menu" aria-expanded="false">More</button>
				<div data-submenu="true"><button role="menuitem">Sub item</button></div>
			</div>
		`
		const trigger = document.querySelector<HTMLElement>('#trigger')!
		const menu = document.querySelector<HTMLElement>('#menu')!
		const owner = document.querySelector<HTMLElement>('#owner')!
		const submenu = owner.nextElementSibling as HTMLElement
		const items = () => [...menu.querySelectorAll<HTMLElement>(':scope > [role^="menuitem"]')]
		const onSelect = vi.fn()
		const onOpenChange = vi.fn()
		const controller = createMenuController({
			portal: false,
			getPortalRoot: () => document.body,
			getTrigger: () => trigger,
			getMenu: () => menu,
			getItems: items,
			getSubmenu: (item) => item === owner ? submenu : null,
			onSelect,
			onOpenChange
		})
		controller.mount()
		controller.mount()
		trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))
		controller.close(false)
		trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}))
		vi.runOnlyPendingTimers()
		controller.close(false)
		trigger.click()
		vi.runOnlyPendingTimers()
		const prevented = new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true})
		prevented.preventDefault()
		menu.dispatchEvent(prevented)
		for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'p'])
			menu.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
		controller.select(items()[1]!)
		controller.select(items()[2]!)
		expect(items()[2]!.getAttribute('aria-checked')).toBe('true')
		controller.select(items()[3]!)
		expect(items()[3]!.getAttribute('aria-checked')).toBe('true')
		controller.select(owner)
		expect(owner.getAttribute('aria-expanded')).toBe('true')
		submenu.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}))
		owner.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))
		items()[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))
		controller.open()
		menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
		controller.open()
		items()[2]!.dispatchEvent(new PointerEvent('pointermove', {bubbles: true}))
		items()[2]!.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}))
		menu.dispatchEvent(new PointerEvent('pointermove', {bubbles: true}))
		controller.open()
		trigger.click()
		controller.open()
		controller.setActiveIndex(0)
		controller.move(-1)
		vi.runOnlyPendingTimers()
		controller.close(false)
		controller.destroy()
		expect(onSelect).toHaveBeenCalled()
		expect(onOpenChange).toHaveBeenCalled()

		const missing = createMenuController({
			getTrigger: () => null,
			getMenu: () => null,
			getItems: () => []
		})
		missing.mount()
		missing.move(1)
		missing.destroy()
	})

	it('covers tooltip focus descriptions, coarse pointers and touch longpress', () => {
		vi.useFakeTimers()
		document.body.innerHTML = '<span id="trigger"><button id="child" aria-describedby="existing"></button></span><span id="tip" role="tooltip"></span>'
		const trigger = document.querySelector<HTMLElement>('#trigger')!
		const child = document.querySelector<HTMLElement>('#child')!
		const tooltip = document.querySelector<HTMLElement>('#tip')!
		Object.defineProperty(window, 'matchMedia', {configurable: true, value: vi.fn(() => ({matches: true}))})
		const controller = createTooltipController({
			getTrigger: () => trigger,
			getTooltip: () => tooltip,
			portal: false,
			getPortalRoot: () => document.body,
			openDelayMs: 5,
			closeDelayMs: 5,
			touch: 'longpress'
		})
		controller.mount()
		controller.mount()
		trigger.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}))
		vi.advanceTimersByTime(5)
		expect(controller.getState().open).toBe(true)
		trigger.dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: child}))
		trigger.dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: document.body}))
		vi.advanceTimersByTime(5)
		trigger.dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'touch'}))
		vi.advanceTimersByTime(500)
		trigger.dispatchEvent(new PointerEvent('pointerup', {pointerType: 'touch'}))
		trigger.dispatchEvent(new PointerEvent('pointercancel', {pointerType: 'touch'}))
		controller.close()
		vi.advanceTimersByTime(5)
		controller.destroy()
		expect(child.getAttribute('aria-describedby')).toBe('existing')

		const missing = createTooltipController({getTrigger: () => null, getTooltip: () => null})
		missing.mount()
		missing.destroy()

		document.body.innerHTML = '<button id="direct"></button><span id="no-id"></span>'
		const direct = document.querySelector<HTMLElement>('#direct')!
		const noId = document.querySelector<HTMLElement>('#no-id')!
		const coarse = createTooltipController({getTrigger: () => direct, getTooltip: () => noId})
		coarse.mount()
		direct.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'touch'}))
		direct.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}))
		coarse.destroy()
	})
})
