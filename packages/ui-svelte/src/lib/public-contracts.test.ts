import {cleanup, fireEvent, render} from '@testing-library/svelte'
import {afterEach, describe, expect, it, vi} from 'vitest'

import Input from './Input.svelte'
import MultiSelect from './MultiSelect.svelte'
import RadioGroup from './RadioGroup.svelte'
import Textarea from './Textarea.svelte'

afterEach(() => { cleanup(); document.body.innerHTML = '' })
describe('public control attributes', () => {
	for (const textarea of [false, true]) {
		it(`forwards native attributes and events to ${textarea ? 'textarea' : 'input'} and merges descriptions`, async() => {
			const oninput = vi.fn(), onblur = vi.fn(), onkeydown = vi.fn(), onChange = vi.fn()
			const props = {value: '', ariaLabel: 'External name', 'aria-describedby': 'outside', description: 'Help', error: 'Invalid', maxlength: 15, minlength: 2, spellcheck: false, tabindex: 3, form: 'external-form', oninput, onblur, onkeydown, onChange}
			const view = textarea ? render(Textarea, {props}) : render(Input, {props})
			const control = view.getByRole('textbox', {name: 'External name'}) as HTMLInputElement
			expect(control.getAttribute('maxlength')).toBe('15')
			expect(control.getAttribute('form')).toBe('external-form')
			expect(control.getAttribute('aria-describedby')).toMatch(/^outside .*?-description .*?-error$/)
			await fireEvent.input(control, {target: {value: 'Edited'}}); await fireEvent.blur(control); await fireEvent.keyDown(control, {key: 'Enter'})
			expect(oninput).toHaveBeenCalledTimes(1)
			expect(onChange).toHaveBeenCalledExactlyOnceWith('Edited')
			expect(onblur).toHaveBeenCalledTimes(1)
			expect(onkeydown).toHaveBeenCalledTimes(1)
		})
	}
	it('does not allow disabled chip removal and supports hiding optional actions', async() => {
		const onChange = vi.fn()
		const view = render(MultiSelect, {props: {label: 'Tags', values: ['a'], options: [{value: 'a', label: 'Alpha'}], disabled: true, showClear: false, showSelectAll: false, onChange}})
		const remove = view.getByRole('button', {name: 'Remove Alpha'}) as HTMLButtonElement
		expect(remove.disabled).toBe(true)
		await fireEvent.click(remove)
		expect(onChange).not.toHaveBeenCalled()
		expect(document.querySelector('[data-part="select-all"]')).toBeNull()
		expect(document.querySelector('[data-part="clear"]')).toBeNull()
		await view.rerender({disabled: false})
		await fireEvent.click(remove)
		expect(onChange).toHaveBeenCalledExactlyOnceWith([])
	})
	it('allows a named radio group without submitting a name', () => {
		const view = render(RadioGroup, {props: {ariaLabel: 'Theme', options: [{value: 'light', label: 'Light'}]}})
		expect(view.getByRole('radiogroup', {name: 'Theme'})).toBeTruthy()
		expect(view.container.querySelector('input')?.getAttribute('name')).toBeNull()
	})
})
