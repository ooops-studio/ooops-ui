// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createButtonController, getButtonAttributes} from '../src/button'

afterEach(() => { document.body.innerHTML = '' })

it('projects safe native button and link attributes before hydration', () => {
	expect(getButtonAttributes({ariaBusy: true, ariaDisabled: false})).toMatchObject({'aria-busy': 'true', 'aria-disabled': 'false'})
	expect(getButtonAttributes({ariaBusy: null, ariaDisabled: null})).toMatchObject({'aria-busy': undefined, 'aria-disabled': undefined})
	expect(getButtonAttributes()).toMatchObject({type: 'button', disabled: false})
	expect(getButtonAttributes({type: 'submit', loading: true})).toMatchObject({type: 'submit', disabled: true, 'aria-busy': 'true'})
	expect(getButtonAttributes({href: '/next', disabled: true})).toMatchObject({href: undefined, role: 'link', 'aria-disabled': 'true', tabindex: -1})
	expect(getButtonAttributes({href: '/next', tabindex: 2})).toMatchObject({href: '/next', tabindex: 2})
})

it('blocks disabled and busy activation before application listeners, then restores link navigation', () => {
	document.body.innerHTML = '<a role="menuitem">Open</a>'
	const element = document.querySelector('a')!
	const onClick = vi.fn()
	const controller = createButtonController({getElement: () => element, href: '/next', disabled: true})
	controller.mount()
	controller.mount()
	element.addEventListener('click', onClick)
	for (const event of ['click', 'auxclick', 'pointerdown']) {
		const allowed = element.dispatchEvent(new MouseEvent(event, {bubbles: true, cancelable: true}))
		expect(allowed).toBe(false)
	}
	for (const key of ['Enter', ' ']) {
		expect(element.dispatchEvent(new KeyboardEvent('keydown', {key, cancelable: true}))).toBe(false)
	}
	expect(element.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', cancelable: true}))).toBe(true)
	expect(onClick).not.toHaveBeenCalled()
	expect(element.hasAttribute('href')).toBe(false)
	expect(element.getAttribute('role')).toBe('menuitem')
	controller.configure({disabled: false, loading: true})
	expect(element.dispatchEvent(new MouseEvent('click', {cancelable: true}))).toBe(false)
	expect(element.getAttribute('aria-busy')).toBe('true')
	controller.configure({loading: false, tabindex: 0})
	expect(element.getAttribute('href')).toBe('/next')
	expect(element.getAttribute('tabindex')).toBe('0')
	expect(element.hasAttribute('aria-disabled')).toBe(false)
	// Avoid actual jsdom navigation while still proving the application listener is reached.
	element.addEventListener('click', (event) => event.preventDefault())
	element.click()
	expect(onClick).toHaveBeenCalledOnce()
	controller.destroy()
	controller.destroy()
	expect(controller.getState().mounted).toBe(false)
})

it('native buttons retain submit semantics and guards are removed on destroy', () => {
	document.body.innerHTML = '<button>Save</button>'
	const element = document.querySelector('button')!
	const controller = createButtonController({getElement: () => element, type: 'submit', loading: true})
	controller.mount()
	expect(element.disabled).toBe(true)
	expect(element.type).toBe('submit')
	controller.configure({loading: false})
	expect(element.disabled).toBe(false)
	controller.configure({disabled: true})
	controller.destroy()
	const event = new MouseEvent('click', {cancelable: true})
	expect(element.dispatchEvent(event)).toBe(true)
})

it('can mount after a temporarily missing element and does not own application state', () => {
	const controller = createButtonController({getElement: () => document.querySelector('button')})
	controller.mount()
	expect(controller.getState().mounted).toBe(false)
	controller.configure({loading: true})
	document.body.innerHTML = '<button>Save</button>'
	controller.mount()
	expect(document.querySelector('button')?.getAttribute('aria-busy')).toBe('true')
	controller.destroy()
})
