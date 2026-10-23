// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createNonModalFocusController} from '../src/focus-scope'

let controller: ReturnType<typeof createNonModalFocusController> | undefined
afterEach(() => { controller?.destroy(); controller = undefined; vi.restoreAllMocks(); document.body.innerHTML = '' })
it('does not move or trap focus, isolate background, or restore an unrelated opener by default', () => {
	document.body.innerHTML = '<button id="outside">Background</button><aside><button>Close</button></aside>'
	const outside = document.querySelector<HTMLButtonElement>('#outside')!
	const drawer = document.querySelector('aside')!
	const onEscape = vi.fn()
	const scheduleFocus = vi.spyOn(window, 'requestAnimationFrame')
	outside.focus()
	controller = createNonModalFocusController({getContainer: () => drawer, onEscape})
	controller.setOpen(true)
	expect(scheduleFocus).not.toHaveBeenCalled()
	expect(document.activeElement).toBe(outside)
	expect(outside.inert).not.toBe(true)
	expect(outside.getAttribute('aria-hidden')).toBeNull()
	const tab = new KeyboardEvent('keydown', {key: 'Tab', cancelable: true})
	controller.handleKeydown(tab)
	expect(tab.defaultPrevented).toBe(false)
	const escape = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true})
	controller.handleKeydown(escape)
	expect(onEscape).toHaveBeenCalledExactlyOnceWith(escape)
	controller.setOpen(false)
	expect(document.activeElement).toBe(outside)
})

it('supports explicitly requested opening focus and restores it only for that opted-in flow', () => {
	vi.useFakeTimers()
	document.body.innerHTML = '<button id="outside">Background</button><aside><button>Close</button></aside>'
	const outside = document.querySelector<HTMLButtonElement>('#outside')!
	const drawer = document.querySelector('aside')!
	outside.focus()
	controller = createNonModalFocusController({getContainer: () => drawer, focusOnOpen: true})
	try {
		controller.setOpen(true); vi.runAllTimers()
		expect(document.activeElement).toBe(drawer.querySelector('button'))
		controller.destroy(); vi.runAllTimers()
		expect(document.activeElement).toBe(outside)
	} finally { vi.useRealTimers() }
})
