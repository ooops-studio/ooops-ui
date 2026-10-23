// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createModalFocusController, focusInitialTarget, getFocusableElements} from '../src/focus-scope'
import {createLayerController} from '../src/layer'

const cleanup: Array<() => void> = []
afterEach(() => { cleanup.reverse().forEach((fn) => fn()); cleanup.length = 0; vi.restoreAllMocks(); document.body.innerHTML = '' })
it('uses the container when its only controls are hidden, disabled, or excluded from accessibility', () => {
	document.body.innerHTML = '<section tabindex="-1"><fieldset disabled><button>Disabled by fieldset</button></fieldset><button aria-hidden="true">Hidden from accessibility</button><button hidden>Hidden</button></section>'
	const container = document.querySelector('section')!
	expect(getFocusableElements(container)).toEqual([])
	focusInitialTarget(container)
	expect(document.activeElement).toBe(container)
})

it('ignores a removed active modal when determining the top scope and can close without restoring focus', () => {
	document.body.innerHTML = '<button>Outside</button><section><button>Inside</button></section>'
	const section = document.querySelector('section')!
	const scope = createModalFocusController({
		getContainer: () => section, shouldRestoreFocus: () => false
	})
	cleanup.push(() => scope.destroy())
	scope.setOpen(true)
	section.remove()
	expect(scope.isTop()).toBe(false)
	scope.setOpen(false)
	expect(document.querySelector('button')!.inert).not.toBe(true)
})

it('does not use an old route fallback when navigation removed the opener', () => {
	vi.useFakeTimers()
	document.body.innerHTML = '<main><button id="opener">Delete</button><button>Sibling</button></main><section><button>Confirm</button></section>'
	const url = window.location.href
	const section = document.querySelector('section')!
	const opener = document.getElementById('opener')!
	opener.focus()
	const scope = createModalFocusController({getContainer: () => section})
	cleanup.push(() => scope.destroy())
	try {
		scope.setOpen(true); vi.runAllTimers()
		opener.remove()
		window.history.replaceState({}, '', '/new-destination')
		scope.setOpen(false); vi.runAllTimers()
		expect(document.activeElement).toBe(section.querySelector('button'))
	} finally { window.history.replaceState({}, '', url); vi.useRealTimers() }
})

it('dismisses an anchorless layer without restoring a removed trigger or registering a portal owner', () => {
	document.body.innerHTML = '<button>Current focus</button><section hidden>Async popup</section>'
	const focus = document.querySelector('button')!
	const panel = document.querySelector('section')!
	focus.focus()
	const layer = createLayerController({
		getAnchor: () => null, getLayer: () => panel, getDocument: () => document
	})
	cleanup.push(() => layer.destroy())
	layer.mount(); layer.open()
	expect(panel.hidden).toBe(false)
	document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))
	expect(layer.isOpen()).toBe(false)
	expect(document.activeElement).toBe(focus)
})
