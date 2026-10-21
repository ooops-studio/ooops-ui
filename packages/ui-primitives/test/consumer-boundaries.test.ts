// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createDialogController, createFieldController, createMenuController, createSelectController} from '../src/index'

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })
const key = (element: HTMLElement, value: string) => element.dispatchEvent(new KeyboardEvent('keydown', {key: value, bubbles: true, cancelable: true}))

it('keeps dirty state stable for equal cloned dates and nested arrays', async() => {
	const field = createFieldController<unknown>({value: new Date('2026-01-01')})
	await field.setValue(new Date('2026-01-01')); expect(field.getState().dirty).toBe(false)
	await field.setValue(new Date('2026-01-02')); expect(field.getState().dirty).toBe(true)
	field.reset([[1, 2]])
	await field.setValue([[1, 2]]); expect(field.getState().dirty).toBe(false)
	await field.setValue([[1, 3]]); expect(field.getState().dirty).toBe(true)
	await field.setValue([[1, 2, 3]]); expect(field.getState().dirty).toBe(true)
	field.reset(new Date('2026-01-01'))
	await field.setValue([]); expect(field.getState().dirty).toBe(true)
	field.reset([]); await field.setValue(new Date('2026-01-01')); expect(field.getState().dirty).toBe(true)
	field.reset({0: 1}); await field.setValue([1]); expect(field.getState().dirty).toBe(true)
	field.reset([1]); await field.setValue({0: 1}); expect(field.getState().dirty).toBe(true)
	field.destroy()
	const invalid = createFieldController({value: '', rules: [() => Promise.reject('Unavailable validator')]})
	expect(await invalid.validate()).toBe(false)
	expect(invalid.getState().issues).toEqual([{code: 'validation_error', message: 'Validation failed.'}])
	invalid.destroy()
})

it('keeps non-looping RTL menu boundaries and returns focus from a nested menu', () => {
	document.body.innerHTML = '<button id="trigger">Open</button><div id="menu" style="direction:rtl"><button role="menuitem" aria-haspopup="menu">More</button><div role="menu" data-submenu="true" hidden><button role="menuitem">Child</button></div></div>'
	const trigger = document.querySelector<HTMLButtonElement>('#trigger')!, menu = document.querySelector<HTMLElement>('#menu')!
	const [owner, child] = [...menu.querySelectorAll<HTMLButtonElement>('button')]
	const c = createMenuController({
		loop: false,
		getTrigger: () => trigger,
		getMenu: () => menu,
		getItems: () => [owner!, child!],
		getSubmenu: () => owner!.nextElementSibling as HTMLElement})
	c.mount(); c.open(false); key(trigger, 'Home'); expect(document.activeElement).toBe(owner)
	key(owner!, 'ArrowUp'); expect(document.activeElement).toBe(owner)
	key(owner!, 'ArrowDown'); expect(document.activeElement).toBe(owner)
	key(owner!, 'ArrowLeft'); expect(document.activeElement).toBe(child)
	key(child!, 'ArrowRight'); expect(document.activeElement).toBe(owner)
	expect(child!.parentElement!.hidden).toBe(true)
	key(owner!, 'z'); expect(c.getState().activeIndex).toBe(0)
	key(trigger, 'Enter'); expect(c.getState().open).toBe(true)
	c.destroy()
})

it('keeps an empty menu operable without inventing an active item', () => {
	document.body.innerHTML = '<button>Open</button><div role="menu"></div>'
	const trigger = document.querySelector('button')!, menu = document.querySelector<HTMLElement>('div')!
	const c = createMenuController({
		loop: false,
		getTrigger: () => trigger,
		getMenu: () => menu,
		getItems: () => []})
	c.mount(); c.open(false)
	for (const value of ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', 'ArrowRight', 'a']) key(trigger, value)
	expect(c.getState().activeIndex).toBe(-1); c.destroy()
})

it('handles disabled/empty Select options, typeahead misses and a removed listbox safely', () => {
	document.body.innerHTML = '<button id="trigger">Choose</button><div id="list"><div id="alpha" data-ooops-select-option>Alpha</div><div id="alpine" data-ooops-select-option>Alpine</div></div>'
	const trigger = document.querySelector<HTMLButtonElement>('#trigger')!
	let list = document.querySelector<HTMLElement>('#list')
	const onChange = vi.fn()
	const c = createSelectController({options: [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Alpine', disabled: true}], getRoot: () => document.body, getTrigger: () => trigger, getListbox: () => list, onChange})
	c.mount(); c.setDisabled(true); key(trigger, 'Home'); expect(c.getState().open).toBe(false)
	c.setDisabled(false); key(trigger, 'End'); expect(c.getState().open).toBe(true)
	key(trigger, 'a'); key(trigger, 'l'); key(trigger, 'z'); expect(c.getState().activeIndex).toBe(0)
	c.selectIndex(1); c.selectIndex(99); expect(onChange).not.toHaveBeenCalled()
	trigger.click(); expect(c.getState().open).toBe(false)
	c.setOptions([{value: 'b', label: 'Disabled', disabled: true}]); c.setAllowEmpty(false)
	expect(c.getState().value).toBe('')
	c.setAllowEmpty(true); c.setOptions([{value: 'a', label: 'Alpha'}]); c.selectIndex(0)
	expect(onChange).toHaveBeenCalledWith({value: 'a', option: expect.objectContaining({value: 'a'})})
	list!.remove(); list = null; c.setValue('', {emit: true})
	expect(onChange).toHaveBeenLastCalledWith({value: '', option: null}); c.destroy()
})

it('honors Escape policy and ignores backdrop gestures inside the dialog', () => {
	document.body.innerHTML = '<div id="owner"><dialog><button>Inside</button></dialog></div>'
	const dialog = document.querySelector('dialog')!, inside = document.querySelector('button')!
	dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''))
	dialog.close = vi.fn(() => { dialog.removeAttribute('open')
		dialog.dispatchEvent(new Event('close')) })
	const c = createDialogController({closeOnEscape: false,
		getRoot: () => dialog.parentElement,
		getDialog: () => dialog})
	c.mount(); c.mount(); c.open(); c.open()
	dialog.dispatchEvent(new Event('cancel', {cancelable: true}))
	key(inside, 'Escape'); inside.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
	expect(c.getState().open).toBe(true)
	c.toggle()
	expect(c.getState().open).toBe(false)
	c.toggle()
	expect(c.getState().open).toBe(true)
	c.destroy()
})
