// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest'

import {createSearchableMultiSelectController} from '../src/searchable-multi-select'
const options = [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}, {value: 'c', label: 'Closed', disabled: true}]
afterEach(() => { document.body.innerHTML = '' })
describe('searchable entity multi select', () => {
	it('filters, limits, hides selected and preserves unavailable IDs without emitting', () => {
		const onChange = vi.fn()
		const picker = createSearchableMultiSelectController({options, values: ['missing', 'a'], hideSelected: true, limit: 1, onChange})
		expect(picker.getState().options.map((entry) => entry.value)).toEqual(['b'])
		picker.setQuery('closed')
		expect(picker.getState().options[0]?.value).toBe('c')
		picker.configure({options: [], values: ['missing', 'a']})
		expect(picker.getState().values).toEqual(['missing', 'a'])
		expect(onChange).not.toHaveBeenCalled()
		picker.destroy()
	})
	it('emits separate add/remove actions, clears the query and closes after a commit', () => {
		const onAdd = vi.fn(), onRemove = vi.fn(), onChange = vi.fn()
		const picker = createSearchableMultiSelectController({options, values: ['missing'], onAdd, onRemove, onChange})
		picker.setQuery('alpha'); picker.toggle('a')
		expect(picker.getState()).toMatchObject({query: '', open: false, values: ['missing', 'a']})
		expect(onAdd).toHaveBeenCalledExactlyOnceWith('a')
		picker.toggle('a')
		expect(onRemove).toHaveBeenCalledExactlyOnceWith('a')
		expect(onChange.mock.calls.map((call) => call[0])).toEqual([['missing', 'a'], ['missing']])
		picker.remove('missing')
		expect(picker.getState().values).toEqual([])
		picker.toggle('c'); picker.toggle('unknown'); picker.remove('absent')
		expect(onChange).toHaveBeenCalledTimes(3)
		picker.destroy()
	})
	it('supports custom search and create without treating creation as a selected ID', () => {
		const onCreate = vi.fn(), onChange = vi.fn()
		const picker = createSearchableMultiSelectController({
			options, filter: (entry, query) => entry.value === query, onCreate, onChange
		})
		picker.setQuery('b'); expect(picker.getState().options.map((entry) => entry.value)).toEqual(['b'])
		picker.setQuery(' New person ')
		const event = new KeyboardEvent('keydown', {key: 'Enter', cancelable: true})
		picker.onInputKeydown(event)
		expect(onCreate).toHaveBeenCalledExactlyOnceWith('New person')
		expect(onChange).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(true)
		picker.destroy()
	})
	it('does not intercept text spaces, composition, disabled edits or native Tab', () => {
		const picker = createSearchableMultiSelectController({options})
		for (const init of [{key: ' '}, {key: 'Tab'}, {key: 'Enter', isComposing: true}]) {
			const event = new KeyboardEvent('keydown', {...init, cancelable: true}); picker.onInputKeydown(event)
			expect(event.defaultPrevented).toBe(false)
		}
		picker.configure({options, disabled: true}); picker.open(); picker.setQuery('x'); picker.toggle('a'); picker.create()
		expect(picker.getState()).toMatchObject({query: '', open: false, values: []})
		picker.destroy()
	})
	it('moves real option focus, skips disabled entries, restores focus and cancels work after teardown', async() => {
		document.body.innerHTML = '<div><input><section><button role="option">A</button><button role="option" disabled>B</button><button role="option">C</button></section></div>'
		const root = document.querySelector('div')!, input = document.querySelector('input')!, entries = [...document.querySelectorAll('button')]
		const picker = createSearchableMultiSelectController({
			options, getRoot: () => root, getInput: () => input, getOptions: () => entries
		})
		picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'ArrowDown'})); await Promise.resolve(); await Promise.resolve()
		expect(document.activeElement).toBe(entries[0])
		const event = new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true})
		entries[0]!.addEventListener('keydown', picker.onListKeydown); entries[0]!.dispatchEvent(event)
		expect(document.activeElement).toBe(entries[2])
		picker.onListKeydown(new KeyboardEvent('keydown', {key: 'Escape'})); expect(document.activeElement).toBe(input)
		picker.open(); picker.onFocusOut(); await new Promise((resolve) => setTimeout(resolve, 1))
		expect(picker.getState().open).toBe(true)
		input.blur(); picker.onFocusOut(); await new Promise((resolve) => setTimeout(resolve, 1))
		expect(picker.getState().open).toBe(false)
		picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'ArrowUp'})); picker.destroy(); await Promise.resolve(); await Promise.resolve()
		expect(document.activeElement).not.toBe(entries[2])
	})
	it('rejects invalid limits', () => {
		expect(() => createSearchableMultiSelectController({options, limit: -1})).toThrow(RangeError)
		const picker = createSearchableMultiSelectController({options})
		expect(() => picker.configure({options, limit: 0.5})).toThrow(RangeError)
		picker.destroy()
	})
})

it('supports end/home/wrap navigation, query clearing and external disabled updates', async() => {
	document.body.innerHTML = '<div><input><button>A</button><button>B</button></div>'
	const root = document.querySelector('div')!, input = root.querySelector('input')!
	const entries = [...root.querySelectorAll('button')]
	const picker = createSearchableMultiSelectController({options, getRoot: () => root,
		getInput: () => input, getOptions: () => entries})
	picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'ArrowUp'}))
	await Promise.resolve(); await Promise.resolve()
	expect(document.activeElement).toBe(entries[1])
	for (const [key, index] of [['Home', 0], ['End', 1], ['ArrowUp', 0], ['ArrowUp', 1]] as const) {
		const event = new KeyboardEvent('keydown', {key, bubbles: true})
		const target = document.activeElement as HTMLElement
		target.addEventListener('keydown', picker.onListKeydown, {once: true})
		target.dispatchEvent(event)
		expect(document.activeElement).toBe(entries[index])
	}
	picker.onListKeydown(new KeyboardEvent('keydown', {key: 'Tab'}))
	picker.onListKeydown(new KeyboardEvent('keydown', {key: 'Enter', isComposing: true}))
	picker.setQuery('alpha'); picker.clearQuery(); expect(picker.getState().query).toBe('')
	picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'Enter'}))
	expect(picker.getState().values).toEqual(['a'])
	picker.create() // no configured action: no mutation
	picker.configure({options, values: ['a'], disabled: true})
	picker.remove('a'); picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'Enter'}))
	picker.onListKeydown(new KeyboardEvent('keydown', {key: 'Home'}))
	expect(picker.getState().values).toEqual(['a'])
	picker.destroy()
})

it('can remove a chip without moving focus or erasing a pending search', () => {
	document.body.innerHTML = '<input><button>Remove</button>'
	const input = document.querySelector('input')!, button = document.querySelector('button')!
	button.focus()
	const picker = createSearchableMultiSelectController({options, values: ['a'],
		restoreFocusOnRemove: false, getInput: () => input})
	picker.setQuery('beta'); picker.remove('a')
	expect(document.activeElement).toBe(button)
	expect(picker.getState()).toMatchObject({values: [], query: 'beta', open: false})
	picker.destroy()
})

it('reactively updates matching, result limits and selected visibility without change events', () => {
	const onChange = vi.fn()
	const picker = createSearchableMultiSelectController({options, onChange})
	picker.setQuery('a')
	picker.configure({options, values: ['a'], hideSelected: true, limit: 1,
		filter: (entry, query) => entry.value === query})
	expect(picker.getState().options).toEqual([])
	picker.configure({options, values: ['a'], limit: 1, filter: () => true})
	expect(picker.getState().options.map((entry) => entry.value)).toEqual(['a'])
	expect(onChange).not.toHaveBeenCalled()
	picker.destroy()
})

it('optionally clears the search on input Escape without changing stored selection', () => {
	const picker = createSearchableMultiSelectController({options, values: ['a'],
		clearQueryOnEscape: true})
	picker.setQuery('beta')
	picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'Escape'}))
	expect(picker.getState()).toMatchObject({query: '', open: false, values: ['a']})
	picker.configure({options, values: ['a'], clearQueryOnEscape: false})
	picker.setQuery('beta'); picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'Escape'}))
	expect(picker.getState().query).toBe('beta')
	picker.destroy()
})

it('supports persistent inline query results while still closing when cleared or disabled', () => {
	const picker = createSearchableMultiSelectController({options, persistentQueryResults: true,
		clearQueryOnEscape: true})
	picker.setQuery('beta'); picker.close()
	expect(picker.getState().open).toBe(true)
	picker.onInputKeydown(new KeyboardEvent('keydown', {key: 'Escape'}))
	expect(picker.getState()).toMatchObject({open: false, query: ''})
	picker.setQuery('beta'); picker.configure({options, disabled: true, persistentQueryResults: true})
	expect(picker.getState().open).toBe(false)
	picker.destroy()
})
