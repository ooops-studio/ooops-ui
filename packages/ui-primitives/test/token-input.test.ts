// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createTokenInputController} from '../src/index'

afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers() })
function setup(values: string[] = ['Alpha'], options = {}) {
	document.body.innerHTML = '<form><input aria-label="Tags"></form>'
	const input = document.querySelector('input')!, form = input.form!, onChange = vi.fn()
	const owner = createTokenInputController({values, getInput: () => input, onChange, ...options})
	owner.mount()
	const type = (value: string) => {input.value = value; input.dispatchEvent(new Event('input'))}
	const key = (value: string, init: KeyboardEventInit = {}) => {
		const event = new KeyboardEvent('keydown', {key: value, bubbles: true, cancelable: true, ...init})
		input.dispatchEvent(event); return event
	}
	const paste = (text: string) => {
		const event = new Event('paste', {cancelable: true})
		Object.defineProperty(event, 'clipboardData', {value: {getData: () => text}})
		input.dispatchEvent(event); return event
	}
	return {owner, input, form, onChange, type, key, paste}
}
it('normalizes external state without removing intentional existing duplicates', () => {
	const {owner, input, onChange} = setup([' Alpha ', '', 'Alpha'])
	expect(owner.getState().values).toEqual(['Alpha', 'Alpha'])
	expect(Object.isFrozen(owner.getState().values)).toBe(true)
	owner.configure({values: ['Remote'], disabled: true, delimiters: [';']})
	expect(input.disabled).toBe(true); expect(owner.getState().values).toEqual(['Remote'])
	expect(onChange).not.toHaveBeenCalled(); owner.destroy()
})
it('commits Enter, commas and blur once, deduplicating incoming tokens', () => {
	const {owner, input, onChange, type, key} = setup()
	type(' Beta '); expect(key('Enter').defaultPrevented).toBe(true)
	expect(onChange).toHaveBeenCalledExactlyOnceWith(['Alpha', 'Beta'])
	type('Beta'); key(','); expect(owner.getState().values).toEqual(['Alpha', 'Beta'])
	type('Gamma'); input.dispatchEvent(new Event('blur'))
	expect(onChange).toHaveBeenCalledTimes(3); expect(input.value).toBe('')
	expect(owner.getState().values).toEqual(['Alpha', 'Beta', 'Gamma']); owner.destroy()
})
it('pastes comma/newline values once and leaves normal native paste alone', () => {
	const {owner, paste, onChange} = setup()
	expect(paste('Beta, Gamma\nBeta').defaultPrevented).toBe(true)
	expect(onChange).toHaveBeenCalledExactlyOnceWith(['Alpha', 'Beta', 'Gamma'])
	expect(paste('Native single token').defaultPrevented).toBe(false)
	const empty = new Event('paste', {cancelable: true})
	document.querySelector('input')!.dispatchEvent(empty)
	expect(empty.defaultPrevented).toBe(false); owner.destroy()
})
it('supports custom delimiters and removes only the last token with empty-query Backspace', () => {
	const {owner, type, key} = setup(['Alpha', 'Beta'], {delimiters: [';']})
	expect(key('Backspace').defaultPrevented).toBe(true)
	expect(owner.getState().values).toEqual(['Alpha'])
	type('Text'); expect(key('Backspace').defaultPrevented).toBe(false)
	expect(key('Enter').defaultPrevented).toBe(false); key(';')
	expect(owner.getState().values).toEqual(['Alpha', 'Text'])
	owner.setQuery(''); owner.remove('Alpha'); owner.remove('Text')
	expect(key('Backspace').defaultPrevented).toBe(false); owner.destroy()
})
it('ignores empty commits, handles allowed duplicates and removes matching tokens consistently', () => {
	const {owner, onChange, key} = setup([], {allowDuplicates: true})
	expect(owner.add(' , \n ')).toBe(false); expect(key('Enter').defaultPrevented).toBe(false)
	owner.add('Tag,Tag'); expect(owner.getState().values).toEqual(['Tag', 'Tag'])
	expect(owner.remove('Missing')).toBe(false); expect(owner.remove('Tag')).toBe(true)
	expect(onChange).toHaveBeenCalledTimes(2)
	expect(owner.getState().values).toEqual([])
	owner.destroy()
})
it('never commits IME Enter/paste or composition key 229', () => {
	const {owner, input, type, key, paste, onChange} = setup()
	input.focus(); input.dispatchEvent(new Event('compositionstart')); type('日本語')
	expect(key('Enter').defaultPrevented).toBe(false)
	expect(paste('A,B').defaultPrevented).toBe(false)
	input.dispatchEvent(new Event('blur')); expect(onChange).not.toHaveBeenCalled()
	input.dispatchEvent(new Event('compositionend')); expect(onChange).not.toHaveBeenCalled()
	expect(key('Enter', {isComposing: true}).defaultPrevented).toBe(false)
	expect(key('Enter', {keyCode: 229}).defaultPrevented).toBe(false)
	key('Enter'); expect(owner.getState().values).toEqual(['Alpha', '日本語']); owner.destroy()
})
it('commits after composition ends only when focus already left the input', () => {
	const {owner, input, type, onChange} = setup()
	input.dispatchEvent(new Event('compositionstart')); type('完成')
	input.dispatchEvent(new Event('compositionend'))
	expect(onChange).toHaveBeenCalledExactlyOnceWith(['Alpha', '完成'])
	owner.destroy()
})
it('honors disabled state for input, keys, paste, add and removal', () => {
	const {owner, input, type, key, paste, onChange} = setup(['Alpha'], {disabled: true})
	expect(input.disabled).toBe(true); type('Blocked'); key('Enter'); paste('A,B')
	expect(owner.add('Blocked')).toBe(false); expect(owner.remove('Alpha')).toBe(false)
	expect(owner.getState().query).toBe(''); expect(onChange).not.toHaveBeenCalled(); owner.destroy()
})
it('restores mount defaults on form reset and respects cancellation and teardown', () => {
	vi.useFakeTimers(); const {owner, input, form, onChange} = setup()
	owner.add('Beta'); owner.setQuery('Pending'); onChange.mockClear()
	form.reset(); vi.runAllTimers(); expect(owner.getState().values).toEqual(['Alpha'])
	expect(input.value).toBe(''); expect(onChange).toHaveBeenCalledExactlyOnceWith(['Alpha'])
	owner.setQuery('Retained'); const cancel = (event: Event) => event.preventDefault()
	form.addEventListener('reset', cancel); form.reset(); vi.runAllTimers()
	expect(input.value).toBe('Retained'); form.removeEventListener('reset', cancel)
	owner.add('New'); form.reset(); owner.destroy(); vi.runAllTimers()
	expect(owner.getState().values).toEqual(['Alpha', 'New'])
})
it('cleans up listeners, tolerates missing input and rejects late updates after destroy', () => {
	const owner = createTokenInputController({getInput: () => null})
	owner.mount()
	owner.configure({values: ['Remote']})
	expect(owner.getState().mounted).toBe(false)
	owner.destroy()
	owner.mount()
	owner.configure({values: ['Late']})
	owner.setValues(['Late'])
	owner.setQuery('Late')
	expect(owner.add('Late')).toBe(false); expect(owner.remove('Remote')).toBe(false)
	expect(owner.getState().values).toEqual(['Remote'])
	const item = setup()
	item.owner.mount()
	item.owner.destroy()
	item.type('Detached')
	item.key('Enter')
	item.paste('A,B')
	item.input.dispatchEvent(new Event('blur'))
	item.input.dispatchEvent(new Event('compositionstart'))
	item.input.dispatchEvent(new Event('compositionend'))
	expect(item.onChange).not.toHaveBeenCalled()
})
