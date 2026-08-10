// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
	createComboboxController,
	createMultiSelectController,
	createNumberInputController,
	createRadioGroupController,
	createSelectController,
	createSliderController,
	createTabsController
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

describe('audit regressions', () => {
	it('prevents disabled sliders from changing through pointer or keyboard input', () => {
		document.body.innerHTML = '<div id="slider"><button data-thumb="0"></button></div>'
		const root = document.querySelector<HTMLElement>('#slider')!
		const thumb = root.querySelector<HTMLButtonElement>('[data-thumb]')!
		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 20))
		const onChange = vi.fn()
		const controller = createSliderController({
			value: 20,
			disabled: true,
			getRoot: () => root,
			getThumbs: () => [thumb],
			onChange
		})
		controller.mount()
		root.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 80}))
		thumb.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}))
		expect(controller.getState().value).toBe(20)
		expect(onChange).not.toHaveBeenCalled()

		controller.configure({disabled: false})
		root.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 80}))
		expect(controller.getState().value).toBe(80)
		expect(onChange).toHaveBeenLastCalledWith(80)
	})

	it('keeps Home and End inert when NumberInput has no explicit bounds', () => {
		document.body.innerHTML = '<input type="number">'
		const input = document.querySelector<HTMLInputElement>('input')!
		const controller = createNumberInputController({value: 5, getInput: () => input})
		controller.mount()
		input.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Home'}))
		expect(controller.getState().value).toBe(5)
		input.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'End'}))
		expect(controller.getState().value).toBe(5)
	})

	it('rejects invalid numeric controller configurations', () => {
		expect(() => createNumberInputController({step: 0, getInput: () => null})).toThrow(RangeError)
		expect(() =>
			createSliderController({min: 10, max: 10, getRoot: () => null, getThumbs: () => []})
		).toThrow(RangeError)
		expect(() =>
			createSliderController({
				min: 0,
				max: 10,
				step: 2,
				minStepsBetweenThumbs: 6,
				getRoot: () => null,
				getThumbs: () => []
			})
		).toThrow(RangeError)
	})

	it('clears removed choice, combobox and multi-select values and emits the correction', () => {
		document.body.innerHTML = `
			<div id="choices"><input value="a"><input value="b"></div>
			<div id="combo"><input id="combo-input"><input id="combo-native"></div><div id="combo-list"></div>
			<div id="multi"><input id="multi-input"></div><div id="multi-list"></div>
		`
		const choiceChange = vi.fn()
		const choiceRoot = document.querySelector<HTMLElement>('#choices')!
		const choice = createRadioGroupController({
			options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}],
			value: 'b',
			getRoot: () => choiceRoot,
			getInputs: () => [...choiceRoot.querySelectorAll<HTMLInputElement>('input')],
			onChange: choiceChange
		})
		choice.mount()
		choice.setOptions([{value: 'a', label: 'A'}])
		expect(choice.getState().value).toBe('')
		expect(choiceChange).toHaveBeenLastCalledWith('')

		const comboChange = vi.fn()
		const comboInput = document.querySelector<HTMLInputElement>('#combo-input')!
		const comboNative = document.querySelector<HTMLInputElement>('#combo-native')!
		const combo = createComboboxController({
			options: [{value: 'a', label: 'A'}],
			value: 'a',
			getRoot: () => document.querySelector('#combo'),
			getInput: () => comboInput,
			getNativeInput: () => comboNative,
			getListbox: () => document.querySelector('#combo-list'),
			getOptions: () => [],
			onChange: comboChange
		})
		combo.mount()
		combo.setOptions([])
		expect(combo.getState().value).toBe('')
		expect(comboNative.value).toBe('')
		expect(comboChange).toHaveBeenLastCalledWith({value: '', option: null, custom: false})
		combo.setAllowCustomValue(true)
		combo.setValue('custom')
		expect(combo.getState().value).toBe('custom')
		combo.setAllowCustomValue(false)
		expect(combo.getState().value).toBe('')
		expect(comboInput.value).toBe('')

		const multiChange = vi.fn()
		const multi = createMultiSelectController({
			options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}],
			values: ['a', 'b'],
			getRoot: () => document.querySelector('#multi'),
			getInput: () => document.querySelector('#multi-input'),
			getListbox: () => document.querySelector('#multi-list'),
			getOptions: () => [],
			onChange: multiChange
		})
		multi.mount()
		multi.setOptions([{value: 'a', label: 'A'}])
		expect(multi.getState().values).toEqual(['a'])
		expect(multiChange).toHaveBeenLastCalledWith(['a'])
		multi.setMaxSelected(0)
		expect(multi.getState().values).toEqual([])
		expect(() => multi.setMaxSelected(-1)).toThrow(RangeError)
		expect(() =>
			createMultiSelectController({
				options: [],
				maxSelected: -1,
				getRoot: () => null,
				getInput: () => null,
				getListbox: () => null,
				getOptions: () => []
			})
		).toThrow(RangeError)
	})

	it('applies reactive disabled state and refreshes removed tabs', () => {
		document.body.innerHTML = `
			<div id="select"><button id="trigger"></button></div><div id="listbox"></div>
			<div id="tabs"><button data-tab data-value="first"></button><button data-tab data-value="second"></button></div>
		`
		const trigger = document.querySelector<HTMLButtonElement>('#trigger')!
		const select = createSelectController({
			options: [{value: 'a', label: 'A'}],
			disabled: true,
			getRoot: () => document.querySelector('#select'),
			getTrigger: () => trigger,
			getListbox: () => document.querySelector('#listbox')
		})
		select.mount()
		select.open()
		expect(select.getState().open).toBe(false)
		select.setDisabled(false)
		select.open()
		expect(select.getState().open).toBe(true)

		const tabsRoot = document.querySelector<HTMLElement>('#tabs')!
		const onChange = vi.fn()
		const tabs = createTabsController({
			activeId: 'second',
			getTabs: () => [...tabsRoot.querySelectorAll<HTMLElement>('[data-tab]')],
			onChange
		})
		tabs.mount()
		tabsRoot.querySelector('[data-value="second"]')?.remove()
		tabs.refresh()
		expect(tabs.getState().activeId).toBe('first')
		expect(onChange).toHaveBeenLastCalledWith('first')
	})
})
