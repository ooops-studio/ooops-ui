// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createLayerController} from '../src/layer'
import {createMenuController} from '../src/menu'

const cleanup: Array<() => void> = []
afterEach(() => { cleanup.reverse().forEach((fn) => fn()); cleanup.length = 0; document.body.innerHTML = ''; vi.restoreAllMocks() })
const setup = () => {
	document.body.innerHTML = '<button id="opener">Open</button><div role="menu"><input><button role="menuitemcheckbox" aria-checked="false">Action</button><button role="menuitem" aria-haspopup="menu">More</button></div>'
	const trigger = document.getElementById('opener')!, menu = document.querySelector<HTMLElement>('[role="menu"]')!
	const actions = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')]
	const controller = createMenuController({open:true, activation:'native', triggerEvents:false, captureEscape:false, positioning:false, getTrigger:() => trigger, getMenu:() => menu, getItems:() => actions})
	cleanup.push(() => controller.destroy());controller.mount()
	return {controller, trigger, menu, actions}
}
it('keeps native click handlers as the only selection owner for pointer and keyboard activation', () => {
	const {controller, trigger, actions} = setup(), click = vi.fn()
	actions[0]!.addEventListener('click', click)
	trigger.click();expect(controller.getState().open).toBe(true)
	actions[0]!.dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));actions[0]!.click()
	expect(click).toHaveBeenCalledOnce();expect(actions[0]!.getAttribute('aria-checked')).toBe('false')
	actions[0]!.focus();actions[0]!.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}))
	expect(click).toHaveBeenCalledTimes(2);expect(controller.getState().open).toBe(true)
})
it('retains native editable keys, and allows a local Escape to consume a search-clear interaction', () => {
	const {controller, menu} = setup(), input = menu.querySelector('input')!
	input.focus()
	const arrow = new KeyboardEvent('keydown', {key:'ArrowDown', bubbles:true, cancelable:true});input.dispatchEvent(arrow)
	expect(arrow.defaultPrevented).toBe(false)
	input.addEventListener('keydown', (event) => {event.preventDefault();event.stopPropagation()}, {once:true})
	input.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}))
	expect(controller.getState().open).toBe(true)
	input.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}))
	expect(controller.getState().open).toBe(false)
})
it('updates roving focus after programmatic focus and delegates submenu opening to its native host', () => {
	const {controller, actions} = setup(), more = vi.fn()
	actions[1]!.addEventListener('click', more)
	actions[1]!.focus();expect(controller.getState().activeIndex).toBe(1)
	actions[1]!.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true, cancelable:true}))
	expect(more).toHaveBeenCalledOnce()
	actions[1]!.dispatchEvent(new KeyboardEvent('keydown', {key:'Tab', bubbles:true, cancelable:true}))
	expect(controller.getState().open).toBe(false)
})
it('can retain host-owned visibility and use a bubble click dismissal request with its original Event', () => {
	document.body.innerHTML = '<button>Outside</button><section data-state="host-owned">Popup</section>'
	const panel = document.querySelector('section')!, request = vi.fn(() => false)
	const layer = createLayerController({getAnchor:() => null, getLayer:() => panel, positioning:false, portal:false, manageVisibility:false, pointerEventName:'click', capturePointer:false, beforeClose:request})
	cleanup.push(() => layer.destroy());layer.mount();layer.open()
	const event = new MouseEvent('click', {bubbles:true});document.querySelector('button')!.dispatchEvent(event)
	expect(request).toHaveBeenCalledExactlyOnceWith('outside-pointer', event)
	expect(layer.isOpen()).toBe(true);expect(panel.dataset.state).toBe('host-owned')
	layer.destroy();expect(panel.hidden).toBe(false)
})
