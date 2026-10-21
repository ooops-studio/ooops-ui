import {cleanup, fireEvent, render} from '@testing-library/svelte'
import {afterEach, expect, it, vi} from 'vitest'

import Button from './Button.svelte'
import IconButton from './IconButton.svelte'

afterEach(cleanup)
it('preserves explicit passive ARIA states independently of operational loading', async() => {
	const view = render(Button, {props: {ariaLabel: 'Background task', 'aria-busy': 'true',
		'aria-disabled': 'true'}})
	const element = view.getByRole('button', {name: 'Background task'}) as HTMLButtonElement
	expect(element.getAttribute('aria-busy')).toBe('true')
	expect(element.getAttribute('aria-disabled')).toBe('true')
	expect(element.disabled).toBe(false)
	await view.rerender({'aria-busy': 'false', 'aria-disabled': 'false', loading: true})
	expect(element.getAttribute('aria-busy')).toBe('true')
	expect(element.disabled).toBe(true)
	await view.rerender({loading: false})
	expect(element.getAttribute('aria-busy')).toBe('false')
	expect(element.getAttribute('aria-disabled')).toBe('false')
})
it('reacts to loading/disabled and forwards native form attributes and events', async() => {
	const onclick = vi.fn(), onkeydown = vi.fn()
	const view = render(Button, {props: {ariaLabel: 'Save', loading: true, type: 'submit',
		name: 'action', value: 'save', form: 'record', onclick, onkeydown}})
	const element = view.getByRole('button', {name: 'Save'}) as HTMLButtonElement
	expect(element.disabled).toBe(true)
	expect(element.getAttribute('aria-busy')).toBe('true')
	expect(element.getAttribute('form')).toBe('record')
	expect(element.type).toBe('submit')
	await fireEvent.click(element)
	expect(onclick).not.toHaveBeenCalled()
	await view.rerender({loading: false})
	expect(element.disabled).toBe(false)
	await fireEvent.click(element)
	await fireEvent.keyDown(element, {key: 'Enter'})
	expect(onclick).toHaveBeenCalledOnce()
	expect(onkeydown).toHaveBeenCalledOnce()
})
it('keeps disabled links inert and restores href/tabindex on updates', async() => {
	const onclick = vi.fn()
	const view = render(Button, {props: {href: '#next', disabled: true,
		ariaLabel: 'Next', tabindex: 2, onclick}})
	const element = view.getByRole('link', {name: 'Next'})
	expect(element.hasAttribute('href')).toBe(false)
	expect(element.getAttribute('tabindex')).toBe('-1')
	await fireEvent.click(element)
	expect(onclick).not.toHaveBeenCalled()
	await view.rerender({disabled: false})
	expect(element.getAttribute('href')).toBe('#next')
	expect(element.getAttribute('tabindex')).toBe('2')
	await fireEvent.click(element)
	expect(onclick).toHaveBeenCalledOnce()
})
it('requires a real accessible name for icon-only controls', () => {
	const view = render(IconButton, {props: {label: 'Refresh results'}})
	expect(view.getByRole('button', {name: 'Refresh results'}).getAttribute('data-icon-only')).toBe('true')
	expect(() => render(IconButton, {props: {label: '  '}})).toThrow(/nonempty accessible label/)
})
