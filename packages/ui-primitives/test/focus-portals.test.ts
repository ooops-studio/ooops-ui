// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createModalFocusController, registerModalFocusPortal} from '../src/focus-scope'

const cleanup: Array<() => void> = []
afterEach(() => { cleanup.reverse().forEach((fn) => fn()); cleanup.length = 0; vi.restoreAllMocks(); document.body.innerHTML = '' })
const setup = () => {
	document.body.innerHTML = '<main><button>Background</button></main><section id="modal"><button id="owner">Open menu</button></section><div id="portal"><button id="child">Child</button></div><div id="nested"><button id="deep">Deep</button></div>'
	const queue: FrameRequestCallback[] = []
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { queue.push(callback); return queue.length })
	const modal = document.getElementById('modal')!
	const scope = createModalFocusController({getContainer: () => modal})
	cleanup.push(() => scope.destroy())
	return {scope, flush: () => queue.splice(0).forEach((callback) => callback(0))}
}
const node = (id: string) => document.getElementById(id)!

it('allows focus in an owned portal without granting arbitrary external roots focus access', () => {
	const {scope, flush} = setup()
	cleanup.push(registerModalFocusPortal(node('portal'), node('owner')))
	scope.setOpen(true); flush()
	expect(node('portal').inert).not.toBe(true)
	document.addEventListener('focusin', scope.handleFocusin)
	cleanup.push(() => document.removeEventListener('focusin', scope.handleFocusin))
	node('child').focus()
	flush()
	expect(document.activeElement).toBe(node('child'))
	document.querySelector<HTMLElement>('main button')!.focus(); flush()
	expect(document.activeElement).toBe(node('owner'))
})

it('resolves nested portal ownership and restores all isolation on close', () => {
	const {scope} = setup()
	cleanup.push(registerModalFocusPortal(node('portal'), node('owner')))
	cleanup.push(registerModalFocusPortal(node('nested'), node('child')))
	scope.setOpen(true)
	expect(node('nested').inert).not.toBe(true)
	expect(document.querySelector('main')!.inert).toBe(true)
	scope.setOpen(false)
	expect(document.querySelector('main')!.inert).not.toBe(true)
})

it('isolates an unregistered or orphaned portal while the modal remains active', () => {
	const {scope} = setup()
	const release = registerModalFocusPortal(node('portal'), node('owner'))
	cleanup.push(release)
	scope.setOpen(true)
	expect(node('portal').inert).not.toBe(true)
	release()
	expect(node('portal').inert).toBe(true)
})

it('keeps deep portal focus and rejects cyclic portal ownership outside the modal', () => {
	const {scope, flush} = setup()
	cleanup.push(registerModalFocusPortal(node('portal'), node('owner')))
	cleanup.push(registerModalFocusPortal(node('nested'), node('child')))
	document.addEventListener('focusin', scope.handleFocusin)
	cleanup.push(() => document.removeEventListener('focusin', scope.handleFocusin))
	scope.setOpen(true); flush()
	node('deep').focus(); flush()
	expect(document.activeElement).toBe(node('deep'))
	const releaseCycle = registerModalFocusPortal(node('portal'), node('deep'))
	cleanup.push(releaseCycle)
	expect(node('portal').inert).toBe(true)
	expect(node('nested').inert).toBe(true)
	node('child').focus(); flush()
	expect(document.activeElement).toBe(node('owner'))
})

it('isolates siblings along every ancestor branch and restores pre-existing isolation attributes', () => {
	const {scope} = setup()
	const wrapper = document.createElement('section')
	const sibling = document.createElement('aside')
	sibling.setAttribute('aria-hidden', 'false')
	wrapper.append(node('modal'), sibling)
	document.body.append(wrapper)
	scope.setOpen(true)
	expect(sibling.inert).toBe(true)
	expect(sibling.getAttribute('aria-hidden')).toBe('true')
	scope.setOpen(false)
	expect(sibling.inert).not.toBe(true)
	expect(sibling.getAttribute('aria-hidden')).toBe('false')
})
