import {cleanup, fireEvent, render} from '@testing-library/svelte'
import {afterEach, describe, expect, it, vi} from 'vitest'

import Accordion from './Accordion.svelte'
import Combobox from './Combobox.svelte'
import Input from './Input.svelte'
import MultiSelect from './MultiSelect.svelte'
import RadioGroup from './RadioGroup.svelte'
import SegmentedControl from './SegmentedControl.svelte'
import Slider from './Slider.svelte'
import Textarea from './Textarea.svelte'

const options = [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]
afterEach(() => { cleanup(); document.body.innerHTML = '' })

describe('migration regressions', () => {
	for (const kind of ['input', 'textarea'] as const) {
		it(`${kind} emits once after parent updates, including returning to its initial value`, async() => {
			const onChange = vi.fn()
			const props = {value: 'A', label: 'Text', onChange}
			const view = kind === 'input' ? render(Input, {props}) : render(Textarea, {props})
			await view.rerender({value: 'B'})
			expect(onChange).not.toHaveBeenCalled()
			const control = view.container.querySelector(kind)!
			await fireEvent.input(control, {target: {value: 'A'}})
			expect(onChange).toHaveBeenCalledExactlyOnceWith('A')
			await view.rerender({value: 'C'})
			await fireEvent.input(control, {target: {value: 'B'}})
			expect(onChange).toHaveBeenCalledTimes(2)
			expect(onChange).toHaveBeenLastCalledWith('B')
		})
	}

	it('keeps disabled scalar and array projections out of FormData and restores them on enable', async() => {
		const form = document.createElement('form')
		document.body.appendChild(form)
		const combo = render(Combobox, {target: form, props: {name: 'country', label: 'Country', value: 'a', options, disabled: true}})
		const multi = render(MultiSelect, {target: form, props: {name: 'tags', label: 'Tags', values: ['a'], options, disabled: true}})
		const segmented = render(SegmentedControl, {target: form, props: {name: 'view', label: 'View', value: 'a', options, disabled: true}})
		const slider = render(Slider, {target: form, props: {name: 'volume', label: 'Volume', value: [20, 80], disabled: true}})
		expect([...new FormData(form)]).toEqual([])
		await combo.rerender({disabled: false})
		await multi.rerender({disabled: false})
		await segmented.rerender({disabled: false})
		await slider.rerender({disabled: false})
		expect([...new FormData(form)]).toEqual([['country', 'a'], ['tags[]', 'a'], ['view', 'a'], ['volume[]', '20'], ['volume[]', '80']])
		await combo.rerender({disabled: true})
		await multi.rerender({disabled: true})
		await segmented.rerender({disabled: true})
		await slider.rerender({disabled: true})
		expect([...new FormData(form)]).toEqual([])
	})

	it('only clears an editable input and emits exactly once', async() => {
		const onChange = vi.fn()
		const view = render(Input, {props: {value: 'Locked', label: 'Text', readonly: true, clearable: true, onChange}})
		const clear = view.container.querySelector<HTMLButtonElement>('[data-part="clear"]')!
		expect(clear.disabled).toBe(true)
		await fireEvent.click(clear)
		expect(view.container.querySelector('input')?.value).toBe('Locked')
		expect(onChange).not.toHaveBeenCalled()
		await view.rerender({readonly: false})
		await fireEvent.click(clear)
		expect(view.container.querySelector('input')?.value).toBe('')
		expect(onChange).toHaveBeenCalledExactlyOnceWith('')
	})

	it('resets native radios and the rendered selection without a user-change callback', async() => {
		const form = document.createElement('form')
		document.body.appendChild(form)
		const onChange = vi.fn()
		const view = render(RadioGroup, {target: form, props: {name: 'plan', label: 'Plan', value: 'a', options, onChange}})
		const b = view.container.querySelector<HTMLInputElement>('input[value="b"]')!
		b.checked = true
		await fireEvent.change(b)
		expect(view.container.querySelector('[data-selected="true"] input')?.getAttribute('value')).toBe('b')
		form.reset()
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(view.container.querySelector('[data-selected="true"] input')?.getAttribute('value')).toBe('a')
		expect(new FormData(form).get('plan')).toBe('a')
		expect(onChange).toHaveBeenCalledExactlyOnceWith('b')
	})

	it('normalizes accordion modes reactively and respects changing collapsibility', async() => {
		const onChange = vi.fn()
		const view = render(Accordion, {props: {type: 'single', items: [{id: 'a', title: 'A'}, {id: 'b', title: 'B'}], onChange}})
		await view.rerender({type: 'multiple'})
		await fireEvent.click(view.container.querySelector('[data-accordion-trigger][data-value="a"]')!)
		await fireEvent.click(view.container.querySelector('[data-accordion-trigger][data-value="b"]')!)
		expect(view.container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(2)
		await view.rerender({type: 'single', collapsible: false})
		expect(view.container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1)
		expect(onChange).toHaveBeenLastCalledWith(['a'])
		await fireEvent.click(view.container.querySelector('[data-accordion-trigger][data-value="a"]')!)
		expect(view.container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1)
		await view.rerender({type: 'single', collapsible: true, openIds: ['a']})
		await fireEvent.click(view.container.querySelector('[data-accordion-trigger][data-value="a"]')!)
		expect(view.container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)
	})
})
