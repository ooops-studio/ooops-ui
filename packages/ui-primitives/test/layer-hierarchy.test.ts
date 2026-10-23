// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createLayerController} from '../src/layer'

const cleanup: Array<() => void> = []
afterEach(() => { cleanup.reverse().forEach((fn) => fn()); cleanup.length = 0; document.body.innerHTML = ''; vi.restoreAllMocks() })
const setup = (guard = false) => {
	document.body.innerHTML = '<button id="trigger">Open</button><div id="parent"><button id="child-trigger">More</button></div><div id="child"><button id="action">Child action</button></div><input id="outside">'
	const node = (id: string) => document.getElementById(id)!
	const parent = createLayerController({getAnchor: () => node('trigger'), getLayer: () => node('parent'), closeOnOutsideFocus: true})
	const child = createLayerController({getAnchor: () => node('child-trigger'), getLayer: () => node('child'), beforeClose: () => !guard})
	cleanup.push(() => parent.destroy(), () => child.destroy())
	parent.mount(); child.mount(); parent.open(); child.open()
	return {parent, child, node}
}
it('dismisses an entire portalled branch with one outside pointer action', () => {
	const {parent, child, node} = setup()
	node('outside').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
	expect(parent.isOpen()).toBe(false); expect(child.isOpen()).toBe(false)
})
it('retains parents on child portal interaction and closes the branch on outside focus', () => {
	const {parent, child, node} = setup()
	node('action').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
	node('action').focus()
	expect(parent.isOpen()).toBe(true); expect(child.isOpen()).toBe(true)
	node('outside').focus()
	expect(parent.isOpen()).toBe(false); expect(child.isOpen()).toBe(false)
})
it('tears down owned descendants even when a child guard would block independent dismissal', () => {
	const {parent, child} = setup(true)
	child.close(); expect(child.isOpen()).toBe(true)
	parent.close()
	expect(parent.isOpen()).toBe(false); expect(child.isOpen()).toBe(false)
})
it('still dismisses one level per Escape with focus returning to its immediate opener', () => {
	const {parent, child, node} = setup()
	node('action').focus()
	node('action').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))
	expect(child.isOpen()).toBe(false); expect(parent.isOpen()).toBe(true)
	expect(document.activeElement).toBe(node('child-trigger'))
	node('child-trigger').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))
	expect(parent.isOpen()).toBe(false); expect(document.activeElement).toBe(node('trigger'))
})

it('does not close an independent layer when its unrelated neighbor is controlled closed', () => {
	const {parent, child, node} = setup()
	const panel = document.createElement('aside'); document.body.appendChild(panel)
	const independent = createLayerController({getAnchor: () => node('outside'), getLayer: () => panel})
	cleanup.push(() => independent.destroy()); independent.mount(); independent.open()
	parent.close()
	expect(parent.isOpen()).toBe(false); expect(child.isOpen()).toBe(false)
	expect(independent.isOpen()).toBe(true)
})

it('retains open-branch ownership when a child opener is removed by an async list refresh', () => {
	const {parent, child, node} = setup()
	node('child-trigger').remove()
	parent.close()
	expect(child.isOpen()).toBe(false)
})
