// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
	calculateLayerPosition,
	createCheckboxController,
	createMultiSelectController,
	createNumberInputController,
	createRadioGroupController,
	createSegmentedControlController,
	createSliderController
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

describe('mutation-gated checkbox behavior', () => {
	it('projects indeterminate, disabled, checked and reset transitions', () => {
		document.body.innerHTML =
			'<form><label data-part="root"><input type="checkbox"></label></form>'
		const root = document.querySelector<HTMLElement>('[data-part="root"]')!
		const input = document.querySelector<HTMLInputElement>('input')!
		const onChange = vi.fn()
		const controller = createCheckboxController({
			defaultChecked: false,
			indeterminate: true,
			disabled: true,
			getInput: () => input,
			onChange
		})

		controller.mount()
		expect(controller.getState()).toMatchObject({
			checked: false,
			indeterminate: true,
			disabled: true,
			mounted: true
		})
		expect(input).toMatchObject({checked: false, indeterminate: true, disabled: true})
		expect(input.getAttribute('aria-checked')).toBe('mixed')
		expect(root.dataset).toMatchObject({state: 'indeterminate', disabled: 'true'})

		controller.setDisabled(false)
		expect(controller.getState().disabled).toBe(false)
		expect(input.disabled).toBe(false)
		expect(root.dataset.disabled).toBe('false')
		controller.setIndeterminate(false)
		expect(controller.getState().indeterminate).toBe(false)
		expect(input.indeterminate).toBe(false)
		expect(root.dataset.state).toBe('unchecked')
		controller.setChecked(true, true)
		expect(controller.getState()).toMatchObject({
			checked: true,
			indeterminate: false,
			disabled: false
		})
		expect(input).toMatchObject({checked: true, indeterminate: false, disabled: false})
		expect(input.getAttribute('aria-checked')).toBe('true')
		expect(root.dataset).toMatchObject({state: 'checked', disabled: 'false'})
		expect(onChange).toHaveBeenLastCalledWith({checked: true, indeterminate: false})
		onChange.mockClear()
		controller.setChecked(false)
		expect(controller.getState().checked).toBe(false)
		expect(onChange).not.toHaveBeenCalled()

		controller.reset()
		expect(controller.getState()).toMatchObject({checked: false, indeterminate: true})
		expect(root.dataset.state).toBe('indeterminate')
		controller.destroy()
	})

	it('keeps optional DOM and omitted indeterminate defaults safe', () => {
		const missing = createCheckboxController({getInput: () => null})
		expect(() => missing.mount()).not.toThrow()
		expect(() => missing.setChecked(true)).not.toThrow()

		document.body.innerHTML = '<input type="checkbox">'
		const input = document.querySelector<HTMLInputElement>('input')!
		const controller = createCheckboxController({getInput: () => input})
		controller.mount()
		controller.reset()
		expect(controller.getState().indeterminate).toBe(false)
		controller.destroy()
	})
})

describe('mutation-gated layer geometry', () => {
	const frame = {left: 0, top: 0, width: 300, height: 300}
	const calculate = (
		anchor: DOMRect,
		placement: 'top' | 'bottom' | 'left' | 'right',
		align: 'start' | 'center' | 'end' = 'start',
		rtl = false
	) =>
		calculateLayerPosition(anchor, new DOMRect(0, 0, 80, 50), {
			placement,
			align,
			offset: 8,
			padding: 12,
			rtl,
			viewport: frame
		})

	it('calculates each placement and logical alignment exactly', () => {
		const anchor = new DOMRect(100, 100, 40, 20)
		expect(calculate(anchor, 'bottom')).toMatchObject({placement: 'bottom', top: 128, left: 100})
		expect(calculate(anchor, 'top')).toMatchObject({placement: 'top', top: 42, left: 100})
		expect(calculate(anchor, 'left', 'center')).toMatchObject({placement: 'left', top: 85, left: 12})
		expect(calculate(anchor, 'right', 'end')).toMatchObject({placement: 'right', top: 70, left: 148})
		expect(calculate(anchor, 'bottom', 'end')).toMatchObject({left: 60})
		expect(calculate(anchor, 'bottom', 'start', true)).toMatchObject({left: 60})
	})

	it('flips toward available space and shifts inside padded viewport edges', () => {
		expect(calculate(new DOMRect(100, 5, 40, 20), 'top')).toMatchObject({
			placement: 'bottom',
			top: 33,
			left: 100,
			maxWidth: 276,
			maxHeight: 276,
			anchorWidth: 40
		})
		expect(calculate(new DOMRect(280, 100, 20, 20), 'bottom')).toMatchObject({left: 208})
		expect(calculate(new DOMRect(100, 285, 20, 15), 'bottom')).toMatchObject({
			placement: 'top',
			top: 227
		})
		const offsetFrame = {left: 50, top: 40, width: 240, height: 220}
		const offsetResult = calculateLayerPosition(
			new DOMRect(55, 45, 30, 20),
			new DOMRect(0, 0, 80, 50),
			{
				placement: 'left',
				align: 'start',
				offset: 8,
				padding: 12,
				rtl: false,
				viewport: offsetFrame
			}
		)
		expect(offsetResult).toMatchObject({placement: 'right', left: 93, top: 52})
	})
})

describe('mutation-gated multi-select behavior', () => {
	it('enforces allowed unique values, maximum, selection helpers and Backspace removal', () => {
		document.body.innerHTML = `
			<div id="root"><input id="input"></div>
			<div id="listbox">
				<div data-option-index="0"></div><div data-option-index="1"></div>
				<div data-option-index="2"></div><div data-option-index="3"></div>
			</div>
		`
		const input = document.querySelector<HTMLInputElement>('#input')!
		const onChange = vi.fn()
		const controller = createMultiSelectController({
			options: [
				{value: 'a', label: 'Alpha'},
				{value: 'b', label: 'Beta'},
				{value: 'c', label: 'Gamma'},
				{value: 'disabled', label: 'Disabled', disabled: true}
			],
			maxSelected: 2,
			getRoot: () => document.querySelector('#root'),
			getInput: () => input,
			getListbox: () => document.querySelector('#listbox'),
			getOptions: () => [...document.querySelectorAll<HTMLElement>('[data-option-index]')],
			onChange
		})

		controller.mount()
		controller.setValues(['a'])
		expect(onChange).not.toHaveBeenCalled()
		controller.setValues(['a', 'a', 'disabled', 'b', 'c'], true)
		expect(controller.getState().values).toEqual(['a', 'b'])
		expect(Object.isFrozen(controller.getState().values)).toBe(true)
		expect(onChange).toHaveBeenLastCalledWith(['a', 'b'])

		controller.toggleValue('a')
		expect(controller.getState().values).toEqual(['b'])
		expect(onChange).toHaveBeenLastCalledWith(['b'])
		controller.toggleValue('c')
		expect(controller.getState().values).toEqual(['b', 'c'])
		controller.toggleValue('disabled')
		expect(controller.getState().values).toEqual(['b', 'c'])
		expect(onChange).toHaveBeenCalledTimes(3)

		onChange.mockClear()
		controller.selectAll()
		expect(controller.getState().values).toEqual(['a', 'b'])
		expect(onChange).toHaveBeenCalledOnce()
		expect(onChange).toHaveBeenLastCalledWith(['a', 'b'])
		input.value = 'query'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Backspace', bubbles: true}))
		expect(controller.getState().values).toEqual(['a', 'b'])
		input.value = ''
		input.dispatchEvent(new Event('input', {bubbles: true}))
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Delete', bubbles: true}))
		expect(controller.getState().values).toEqual(['a', 'b'])
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Backspace', bubbles: true}))
		expect(controller.getState().values).toEqual(['a'])
		expect(onChange).toHaveBeenLastCalledWith(['a'])
		controller.clear()
		expect(controller.getState().values).toEqual([])
		expect(onChange).toHaveBeenLastCalledWith([])
		controller.destroy()
	})
})

describe('mutation-gated dynamic choice behavior', () => {
	it('delegates events to radio and segmented options added after mount', () => {
		document.body.innerHTML = `
			<div id="radios"><input type="radio" value="a"><input type="radio" value="b"></div>
			<div id="segments"><button value="a"></button><button value="b"></button></div>
		`
		const radios = document.querySelector<HTMLElement>('#radios')!
		const segments = document.querySelector<HTMLElement>('#segments')!
		const radio = createRadioGroupController({
			options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}],
			value: 'a',
			getRoot: () => radios,
			getInputs: () => [...radios.querySelectorAll<HTMLInputElement>('input')]
		})
		const segmented = createSegmentedControlController({
			options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}],
			value: 'a',
			getRoot: () => segments,
			getInputs: () => [...segments.querySelectorAll<HTMLButtonElement>('button')]
		})
		radio.mount()
		segmented.mount()
		const radioC = document.createElement('input')
		radioC.type = 'radio'
		radioC.value = 'c'
		radios.append(radioC)
		const segmentC = document.createElement('button')
		segmentC.value = 'c'
		segments.append(segmentC)
		const nextOptions = [
			{value: 'a', label: 'A'},
			{value: 'b', label: 'B'},
			{value: 'c', label: 'C'}
		]
		radio.setOptions(nextOptions)
		segmented.setOptions(nextOptions)
		radioC.dispatchEvent(new Event('change', {bubbles: true}))
		segmentC.click()
		expect(radio.getState().value).toBe('c')
		expect(segmented.getState().value).toBe('c')
		radio.destroy()
		segmented.destroy()
	})
})

describe('mutation-gated number and slider behavior', () => {
	it('preserves invalid intermediate text and clamps finite values on blur', () => {
		document.body.innerHTML = '<input id="number">'
		const input = document.querySelector<HTMLInputElement>('#number')!
		const onChange = vi.fn()
		const controller = createNumberInputController({
			min: 0,
			max: 10,
			step: 2,
			clampOnBlur: true,
			getInput: () => input,
			onChange
		})
		controller.mount()

		input.value = 'not-a-number'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		expect(controller.getState()).toMatchObject({text: 'not-a-number', value: null, valid: false})
		expect(input.getAttribute('aria-invalid')).toBe('true')
		expect(onChange).toHaveBeenLastCalledWith(null)

		input.value = '7.1'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		expect(controller.getState()).toMatchObject({text: '7.1', value: 7.1, valid: true})
		input.dispatchEvent(new FocusEvent('blur'))
		expect(controller.getState()).toMatchObject({text: '8', value: 8, valid: true})
		expect(input.value).toBe('8')
		input.value = '-1'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		expect(controller.getState()).toMatchObject({value: -1, valid: false})
		input.value = '11'
		input.dispatchEvent(new Event('input', {bubbles: true}))
		expect(controller.getState()).toMatchObject({value: 11, valid: false})
		input.value = ''
		input.dispatchEvent(new Event('input', {bubbles: true}))
		expect(controller.getState()).toMatchObject({value: null, text: '', valid: true})
		controller.destroy()
	})

	it('steps unbounded inputs from zero instead of a maximum-safe-integer origin', () => {
		document.body.innerHTML = '<div><button id="increment"></button><input value="1"></div>'
		const input = document.querySelector<HTMLInputElement>('input')!
		const increment = document.querySelector<HTMLElement>('#increment')!
		const controller = createNumberInputController({
			value: 1,
			getInput: () => input,
			getIncrement: () => increment
		})
		controller.mount()
		increment.click()
		expect(controller.getState().value).toBe(2)
		expect(input.value).toBe('2')
		controller.destroy()
	})

	it('handles slider direction, paging, endpoints and dual-thumb collisions exactly', () => {
		document.body.innerHTML =
			'<div id="slider"><button data-thumb="0"></button><button data-thumb="1"></button></div>'
		const root = document.querySelector<HTMLElement>('#slider')!
		const thumbs = [...root.querySelectorAll<HTMLElement>('button')]
		const controller = createSliderController({
			value: [20, 80],
			min: 0,
			max: 100,
			step: 5,
			minStepsBetweenThumbs: 2,
			direction: 'rtl',
			getRoot: () => root,
			getThumbs: () => thumbs
		})
		controller.mount()

		thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}))
		expect(controller.getState().value).toEqual([25, 80])
		thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))
		expect(controller.getState().value).toEqual([20, 80])
		thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}))
		expect(controller.getState().value).toEqual([70, 80])
		thumbs[1]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}))
		expect(controller.getState().value).toEqual([70, 80])
		thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown', bubbles: true}))
		expect(controller.getState().value).toEqual([20, 80])
		thumbs[1]!.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageUp', bubbles: true}))
		expect(controller.getState().value).toEqual([20, 100])
		controller.destroy()

		document.body.innerHTML = '<div id="single"><button data-thumb="0"></button></div>'
		const singleRoot = document.querySelector<HTMLElement>('#single')!
		const singleThumb = singleRoot.querySelector<HTMLElement>('button')!
		const single = createSliderController({
			value: 50,
			min: 0,
			max: 100,
			step: 5,
			orientation: 'vertical',
			getRoot: () => singleRoot,
			getThumbs: () => [singleThumb]
		})
		single.mount()
		singleThumb.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}))
		expect(single.getState().value).toBe(55)
		singleThumb.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))
		expect(single.getState().value).toBe(50)
		single.destroy()
	})

	it('refreshes thumbs introduced by a number-to-range shape change', () => {
		document.body.innerHTML = '<div id="dynamic"><button data-thumb="0"></button></div>'
		const root = document.querySelector<HTMLElement>('#dynamic')!
		const controller = createSliderController({
			value: 40,
			step: 5,
			getRoot: () => root,
			getThumbs: () => [...root.querySelectorAll<HTMLElement>('[data-thumb]')]
		})
		controller.mount()
		controller.setValue([30, 70])
		const second = document.createElement('button')
		second.dataset.thumb = '1'
		root.append(second)
		controller.refresh()
		expect(second.getAttribute('aria-valuenow')).toBe('70')
		expect(second.style.getPropertyValue('--ooops-ui-slider-percent')).toBe('70%')
		second.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))
		expect(controller.getState().value).toEqual([30, 75])
		controller.destroy()
	})
})
