import {cleanup, fireEvent, render} from '@testing-library/svelte'
import {tick} from 'svelte'
import {afterEach, expect, it, vi} from 'vitest'

import SearchableMultiSelect from './SearchableMultiSelect.svelte'
afterEach(cleanup)
const options = [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}]
it('renders searchable results, selects and removes chips with exact form values', async() => {
	const onChange = vi.fn()
	const view = render(SearchableMultiSelect, {options, name: 'members', onChange, ariaLabel: 'Members'})
	const input = view.getByRole('combobox')
	await fireEvent.focus(input); await tick()
	expect(input.getAttribute('aria-expanded')).toBe('true')
	await fireEvent.input(input, {target: {value: 'beta'}})
	expect(view.queryByRole('option', {name: 'Alpha'})).toBeNull()
	await fireEvent.click(view.getByRole('option', {name: 'Beta'})); await tick()
	expect(onChange).toHaveBeenCalledExactlyOnceWith(['b'])
	expect(view.container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value).toBe('b')
	await fireEvent.click(view.getByRole('button', {name: 'Remove Beta'}))
	expect(onChange).toHaveBeenLastCalledWith([])
})
it('supports creation, controlled updates and disabled state without extra commits', async() => {
	const onCreate = vi.fn(), onChange = vi.fn()
	const view = render(SearchableMultiSelect, {options, values: ['a'], hideSelected: true, onCreate, onChange})
	const input = view.getByRole('combobox')
	await fireEvent.focus(input)
	expect(view.queryByRole('option', {name: 'Alpha'})).toBeNull()
	await fireEvent.input(input, {target: {value: 'new'}})
	await fireEvent.click(view.getByRole('button', {name: 'Create'}))
	expect(onCreate).toHaveBeenCalledExactlyOnceWith('new')
	await view.rerender({options: [], values: ['a', 'missing'], disabled: true})
	expect(input.hasAttribute('disabled')).toBe(true)
	expect(view.container.querySelectorAll('input[type="hidden"]')).toHaveLength(2)
	expect(onChange).not.toHaveBeenCalled()
})

it('restores initial form selection on reset, respects canceled reset and cleans up', async() => {
	const form = document.createElement('form')
	document.body.appendChild(form)
	const onChange = vi.fn()
	const view = render(SearchableMultiSelect, {target: form,
		props: {options, values: ['a'], name: 'members', onChange}})
	const input = view.getByRole('combobox')
	await fireEvent.focus(input)
	await fireEvent.click(view.getByRole('option', {name: 'Beta'}))
	expect([...new FormData(form)]).toEqual([['members', 'a'], ['members', 'b']])
	const cancel = (event: Event) => event.preventDefault()
	form.addEventListener('reset', cancel)
	form.reset(); await tick()
	expect([...new FormData(form)]).toHaveLength(2)
	form.removeEventListener('reset', cancel)
	form.reset(); await tick()
	expect([...new FormData(form)]).toEqual([['members', 'a']])
	expect(onChange).toHaveBeenCalledTimes(1)
	view.unmount(); form.reset(); await tick()
	form.remove()
})

it('allows styling all rendered parts and preserves unavailable values when disabled', async() => {
	const form = document.createElement('form')
	document.body.appendChild(form)
	const view = render(SearchableMultiSelect, {target: form,
		props: {options, values: ['missing'], name: 'members', disabled: true,
			parts: {input: {class: 'custom-input', style: 'color: red'}}}})
	expect(view.getByRole('combobox').classList.contains('custom-input')).toBe(true)
	expect([...new FormData(form)]).toEqual([])
	await view.rerender({disabled: false})
	expect([...new FormData(form)]).toEqual([['members', 'missing']])
	form.remove()
})
