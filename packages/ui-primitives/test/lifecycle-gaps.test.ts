// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createComboboxController, createNumberInputController} from '../src/index'

afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers() })
const combo = (options: Partial<Parameters<typeof createComboboxController>[0]>) => {
	document.body.innerHTML = '<div id="combo"><input><div id="list"></div></div>'
	return createComboboxController({portal: false, debounceMs: 0,
		getRoot: () => document.querySelector('#combo'), getInput: () => document.querySelector('input'),
		getListbox: () => document.querySelector('#list'), getOptions: () => [], ...options})
}

it('aborts pending combobox work, clears loading and ignores a late result after teardown', async() => {
	let finish = (_entries: Array<{value: string; label: string}>) => {}
	let signal: AbortSignal | undefined
	const controller = combo({loadOptions: (_query, context) => {
		signal = context.signal
		return new Promise((resolve) => { finish = resolve })
	}})
	controller.mount()
	controller.setQuery('pending')
	expect(controller.getState().loading).toBe(true)
	controller.destroy()
	expect(signal?.aborted).toBe(true)
	expect(controller.getState()).toMatchObject({mounted: false, open: false, loading: false})
	finish([{value: 'late', label: 'Late result'}])
	await Promise.resolve()
	await Promise.resolve()
	expect(controller.getState().options).toEqual([])
	expect(controller.getState().loading).toBe(false)
})

it('cancels a debounced combobox request before the loader is called', async() => {
	vi.useFakeTimers()
	const loadOptions = vi.fn(async() => [])
	const controller = combo({debounceMs: 100, loadOptions})
	controller.mount()
	controller.setQuery('waiting')
	controller.destroy()
	await vi.advanceTimersByTimeAsync(200)
	expect(loadOptions).not.toHaveBeenCalled()
	expect(controller.getState().loading).toBe(false)
})

it('distinguishes native bad numeric input from an intentionally empty number field', () => {
	document.body.innerHTML = '<input type="number">'
	const input = document.querySelector('input')!
	const controller = createNumberInputController({getInput: () => input})
	controller.mount()
	// Browsers expose unfinished numeric text as value="" + validity.badInput, unlike jsdom.
	Object.defineProperty(input, 'validity', {configurable: true, value: {badInput: true}})
	input.dispatchEvent(new Event('input'))
	expect(controller.getState()).toMatchObject({value: null, valid: false})
	expect(input.getAttribute('aria-invalid')).toBe('true')
	Reflect.deleteProperty(input, 'validity')
	input.dispatchEvent(new Event('input'))
	expect(controller.getState()).toMatchObject({value: null, valid: true})
	expect(input.getAttribute('aria-invalid')).toBe('false')
	controller.destroy()
})
