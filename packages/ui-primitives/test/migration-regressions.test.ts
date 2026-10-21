// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createAccordionController, createCheckboxController, createRadioGroupController, createSegmentedControlController, createSwitchController} from '../src/index'

beforeEach(() => { document.body.innerHTML = ''; vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('migration state regressions', () => {
	for (const create of [createCheckboxController, createSwitchController]) {
		it('preserves pre-mount native edits and resets to the server default', () => {
			for (const checked of [true, false]) {
				document.body.innerHTML = `<form><input type="checkbox" ${checked ? 'checked' : ''}></form>`
				const input = document.querySelector<HTMLInputElement>('input')!
				input.checked = !checked
				const onChange = vi.fn()
				const controller = create({
					checked, defaultChecked: checked, getInput: () => input, onChange
				})
				controller.mount()
				expect(controller.getState().checked).toBe(!checked)
				expect(input.checked).toBe(!checked)
				expect(onChange).toHaveBeenCalledExactlyOnceWith({checked: !checked, indeterminate: false})
				input.form!.reset()
				vi.advanceTimersByTime(20)
				expect(input.checked).toBe(checked)
				controller.destroy()
			}
		})
	}

	for (const segmented of [false, true]) {
		it(`resets ${segmented ? 'segmented' : 'radio'} state and cancels reset work on teardown`, async() => {
			document.body.innerHTML = segmented
				? '<form><div id="choices"><button value="a"></button><button value="b"></button></div></form>'
				: '<form><fieldset id="choices"><input type="radio" name="plan" value="a" checked><input type="radio" name="plan" value="b"></fieldset></form>'
			const root = document.querySelector<HTMLElement>('#choices')!
			const inputs = [...root.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button')]
			const controller = (segmented ? createSegmentedControlController : createRadioGroupController)({options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}], value: 'a', getRoot: () => root, getInputs: () => inputs})
			controller.mount()
			controller.setValue('b')
			const form = root.closest('form')!
			const prevent = (event: Event) => event.preventDefault()
			form.addEventListener('reset', prevent)
			form.reset()
			await vi.runAllTimersAsync()
			expect(controller.getState().value).toBe('b')
			form.removeEventListener('reset', prevent)
			form.reset()
			form.reset()
			await vi.runAllTimersAsync()
			expect(controller.getState().value).toBe('a')
			controller.setValue('b')
			form.reset()
			controller.destroy()
			await vi.runAllTimersAsync()
			expect(controller.getState().value).toBe('b')
			form.reset()
			await vi.runAllTimersAsync()
			expect(controller.getState().value).toBe('b')
		})
	}

	it('clears a reset default that is no longer an enabled option', async() => {
		document.body.innerHTML = '<form><fieldset><input type="radio" name="x" value="a"><input type="radio" name="x" value="b"></fieldset></form>'
		const root = document.querySelector('fieldset')!
		const controller = createRadioGroupController({value: 'a', getRoot: () => root, getInputs: () => [...root.querySelectorAll('input')], options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]})
		controller.mount()
		controller.setOptions([{value: 'b', label: 'B'}])
		controller.setValue('b')
		root.form!.reset()
		await vi.runAllTimersAsync()
		expect(controller.getState().value).toBe('')
		controller.destroy()
	})

	it('reconfigures accordion modes without losing interaction or emitting redundant changes', () => {
		document.body.innerHTML = '<div data-accordion-root><button data-accordion-trigger data-value="a"></button><button data-accordion-trigger data-value="b"></button><div data-value="a"></div><div data-value="b"></div></div>'
		const root = document.querySelector<HTMLElement>('[data-accordion-root]')!
		const onChange = vi.fn()
		const controller = createAccordionController({type: 'multiple', openIds: ['a', 'b'], getTriggers: () => [...root.querySelectorAll<HTMLElement>('button')], getPanels: () => [...root.querySelectorAll<HTMLElement>('div')], onChange})
		controller.mount()
		controller.configure({type: 'single', collapsible: false})
		expect(controller.getState().openIds).toEqual(['a'])
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['a'])
		controller.toggle('a')
		expect(controller.getState().openIds).toEqual(['a'])
		controller.configure({})
		controller.toggle('a')
		expect(controller.getState().openIds).toEqual([])
		controller.destroy()
	})
})
