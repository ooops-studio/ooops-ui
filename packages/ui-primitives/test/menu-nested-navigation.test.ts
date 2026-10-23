// @vitest-environment jsdom
import {afterEach, expect, it} from 'vitest'

import {createMenuController} from '../src/menu'

let controller: ReturnType<typeof createMenuController> | undefined
afterEach(() => { controller?.destroy(); controller = undefined; document.body.innerHTML = '' })
const setup = (initialOpen = false) => {
	document.body.innerHTML = '<button id="trigger">Actions</button><div id="menu" role="menu" hidden><button role="menuitem" id="parent" aria-haspopup="menu">More</button><div id="child" role="menu" data-submenu="true" hidden><button role="menuitem" disabled>Unavailable</button><button role="menuitem" id="first">First child</button><button role="menuitem" id="last">Last child</button></div><button role="menuitem" id="root-last">Last root</button></div>'
	controller = createMenuController({open: initialOpen, portal: false, getTrigger: () => document.querySelector('#trigger'), getMenu: () => document.querySelector('#menu'), getItems: () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')], getSubmenu: (item) => item.id === 'parent' ? document.querySelector('#child') : null})
	controller.mount()
	return controller
}
const key = (element: HTMLElement, value: string) => element.dispatchEvent(new KeyboardEvent('keydown', {key: value, bubbles: true, cancelable: true}))
const element = (id: string) => document.getElementById(id)!

it('focuses the first enabled submenu item and confines arrow navigation to that menu level', () => {
	const c = setup(); c.open(false)
	c.select(element('parent'))
	expect(document.activeElement).toBe(element('first'))
	key(element('first'), 'ArrowUp')
	expect(document.activeElement).toBe(element('last'))
	key(element('last'), 'ArrowDown')
	expect(document.activeElement).toBe(element('first'))
	key(element('first'), 'ArrowLeft')
	expect(element('child').hidden).toBe(true)
	expect(document.activeElement).toBe(element('parent'))
})

it('honors an initially controlled open state in the layer and mounted DOM', () => {
	const c = setup(true)
	expect(c.getState().open).toBe(true)
	expect(element('menu').hidden).toBe(false)
	key(element('parent'), 'Escape')
	expect(c.getState().open).toBe(false)
})

it('closes every descendant layer when the root menu is controlled closed', () => {
	const c = setup(); c.open(false); c.select(element('parent'))
	// Programmatic root closure is also the public path used by controlled adapters.
	c.close(false)
	expect(element('child').hidden).toBe(true)
	expect(c.getState().open).toBe(false)
	expect(element('parent').getAttribute('aria-expanded')).toBe('false')
})
