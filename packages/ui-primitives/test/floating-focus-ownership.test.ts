// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createFocusTrap} from '../src/focus-trap'
import {createLayerController} from '../src/layer'

const cleanup:Array<() => void> = []
afterEach(() => {cleanup.reverse().forEach((fn) => fn());cleanup.length = 0;document.body.innerHTML = '';vi.restoreAllMocks()})
it('does not let a floating trap consume an owned child layer Escape', () => {
	document.body.innerHTML = '<div id="parent" tabindex="-1"><button id="anchor">More</button></div><div id="child"><button>Child</button></div>'
	const parent = document.getElementById('parent')!, anchor = document.getElementById('anchor')!
	const child = document.getElementById('child')!, close = vi.fn()
	const trap = createFocusTrap({getContainer:() => parent, onEscape:close})
	const layer = createLayerController({getAnchor:() => anchor, getLayer:() => child})
	cleanup.push(() => trap.destroy(), () => layer.destroy())
	trap.activate()
	layer.mount()
	layer.open()
	child.querySelector('button')!.focus()
	expect(document.activeElement).toBe(child.querySelector('button'))
	child.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}))
	expect(layer.isOpen()).toBe(false);expect(close).not.toHaveBeenCalled()
	anchor.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}))
	expect(close).toHaveBeenCalledOnce()
})
it('suspends the parent floating trap while a nested modal owns focus and Escape', () => {
	document.body.innerHTML = '<div id="parent"><button>Parent</button><div id="modal"><button>Confirm</button></div></div>'
	const parent = document.getElementById('parent')!, modal = document.getElementById('modal')!
	const parentClose = vi.fn(), modalClose = vi.fn()
	const parentTrap = createFocusTrap({getContainer:() => parent, onEscape:parentClose})
	const modalTrap = createFocusTrap({modal:true, getContainer:() => modal, onEscape:modalClose})
	cleanup.push(() => parentTrap.destroy(), () => modalTrap.destroy())
	parentTrap.activate()
	modalTrap.activate()
	modal.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}))
	expect(modalClose).toHaveBeenCalledOnce();expect(parentClose).not.toHaveBeenCalled()
})
it('uses focus-only activation without intercepting native Tab or redirecting outside focus', () => {
	document.body.innerHTML = '<input id="outside"><section><button>Inside</button></section>'
	const inside = document.querySelector('section')!
	const outside = document.getElementById('outside')!
	const trap = createFocusTrap({getContainer:() => inside, containFocus:false})
	cleanup.push(() => trap.destroy());trap.activate()
	const tab = new KeyboardEvent('keydown', {key:'Tab', bubbles:true, cancelable:true})
	inside.dispatchEvent(tab)
	expect(tab.defaultPrevented).toBe(false)
	outside.focus()
	expect(document.activeElement).toBe(outside)
})
