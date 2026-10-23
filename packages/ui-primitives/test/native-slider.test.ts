// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createSliderController} from '../src/index'
afterEach(() => {document.body.innerHTML = ''; vi.useRealTimers()})
function setup(disabled = false) {
	document.body.innerHTML = '<form><input type="range" name="level" min="0" max="100" value="20"></form>'
	const input = document.querySelector('input')!, onInput = vi.fn(), onCommit = vi.fn(), onChange = vi.fn()
	const owner = createSliderController({nativeInput: () => input,
		getRoot: () => input, getThumbs: () => [],
		disabled, onInput, onCommit, onChange})
	owner.mount(); return {owner, input, onInput, onCommit, onChange}
}
it('observes native input/change once without replacing keyboard or pointer defaults', () => {
	const {owner, input, onInput, onCommit, onChange} = setup(); owner.mount()
	input.value = '33'
	const event = new Event('input')
	input.dispatchEvent(event)
	expect(owner.getState().value).toBe(33)
	expect(onInput).toHaveBeenCalledExactlyOnceWith(33, event)
	expect(onChange).toHaveBeenCalledExactlyOnceWith(33); expect(onCommit).not.toHaveBeenCalled()
	input.dispatchEvent(new Event('change')); expect(onCommit).toHaveBeenCalledOnce()
	expect(new FormData(input.form!).get('level')).toBe('33')
	const key = new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true, bubbles: true})
	input.dispatchEvent(key); expect(key.defaultPrevented).toBe(false)
	const pointer = new Event('pointerdown', {cancelable: true})
	input.dispatchEvent(pointer)
	expect(pointer.defaultPrevented).toBe(false)
	owner.destroy()
})
it('projects dynamic limits, precision and disabled state, permitting a fixed native range', () => {
	const {owner, input, onInput, onCommit} = setup(true)
	input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change'))
	expect(onInput).not.toHaveBeenCalled(); expect(onCommit).not.toHaveBeenCalled()
	owner.configure({min: 1, max: 2, step: 0.25, disabled: false}); owner.setValue(1.49)
	expect(input.value).toBe('1.5'); expect(input.min).toBe('1'); expect(input.step).toBe('0.25')
	input.disabled = true
	input.dispatchEvent(new Event('input'))
	input.dispatchEvent(new Event('change'))
	expect(onInput).not.toHaveBeenCalled(); expect(onCommit).not.toHaveBeenCalled()
	owner.configure({min: 2, max: 2}); expect(input.value).toBe('2')
	expect(() => owner.setValue([1, 2])).toThrow('one numeric value'); owner.destroy()
})
it('tracks native form reset silently and respects cancellation and destruction', () => {
	vi.useFakeTimers(); const {owner, input, onInput, onCommit} = setup()
	owner.setValue(80)
	input.form!.reset(); vi.runAllTimers()
	expect(owner.getState().value).toBe(20)
	expect(onInput).not.toHaveBeenCalled(); expect(onCommit).not.toHaveBeenCalled()
	owner.setValue(60)
	const cancel = (event: Event) => event.preventDefault()
	input.form!.addEventListener('reset', cancel)
	input.form!.reset(); vi.runAllTimers(); expect(owner.getState().value).toBe(60)
	input.form!.removeEventListener('reset', cancel)
	input.form!.reset()
	owner.destroy()
	vi.runAllTimers()
	expect(owner.getState().value).toBe(60)
	input.value = '50'
	input.dispatchEvent(new Event('input'))
	input.dispatchEvent(new Event('change'))
	expect(onInput).not.toHaveBeenCalled(); expect(onCommit).not.toHaveBeenCalled()
})
it('waits for its native input before mounting and works without a form', () => {
	let input: HTMLInputElement | null = null
	const owner = createSliderController({nativeInput: () => input,
		getRoot: () => document.body, getThumbs: () => []})
	owner.mount(); expect(owner.getState().mounted).toBe(false)
	input = document.createElement('input')
	input.type = 'range'
	document.body.append(input)
	owner.mount()
	expect(owner.getState().mounted).toBe(true); owner.destroy()
})
