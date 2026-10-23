// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
	createModalFocusController,
	createPopoverFocusController,
	focusInitialTarget,
	getFocusableElements,
	restoreFocus,
	trapTabKey
} from '../src/focus-scope'

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

describe('focus management utilities', () => {
	it('gives a nested modal initial focus instead of preserving focus in its now inert parent drawer', () => {
		const queued: FrameRequestCallback[] = []
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { queued.push(callback); return queued.length })
		document.body.innerHTML = '<div id="parent" data-modal-focus-allow><button id="opener">Review</button></div><div id="modal"><button id="confirm">Confirm</button></div>'
		const parent = document.getElementById('parent')!
		const modal = document.getElementById('modal')!
		const confirm = document.getElementById('confirm')!
		document.getElementById('opener')!.focus()
		const controller = createModalFocusController({
			getContainer: () => modal, getInitialFocus: () => confirm
		})
		try {
			controller.setOpen(true)
			expect(parent.getAttribute('aria-hidden')).toBe('true')
			queued.splice(0).forEach((callback) => callback(0))
			expect(document.activeElement).toBe(confirm)
		} finally { controller.destroy() }
	})

	it('keeps focus chosen inside a modal before its opening animation frame', () => {
		const queued: FrameRequestCallback[] = []
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { queued.push(callback); return queued.length })
		document.body.innerHTML = '<button id="opener">Open</button><div id="modal"><button id="close">Close</button><input id="draft" /></div>'
		const modal = document.getElementById('modal')!
		const close = document.getElementById('close')!
		const input = document.getElementById('draft')!
		document.getElementById('opener')!.focus()
		const controller = createModalFocusController({
			getContainer: () => modal, getInitialFocus: () => close
		})
		try {
			controller.setOpen(true)
			input.focus()
			queued.splice(0).forEach((callback) => callback(0))
			expect(document.activeElement).toBe(input)
		} finally { controller.destroy() }
	})

	it('does not steal restored popup focus after a queued modal body reset', () => {
		const queued: FrameRequestCallback[] = []
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { queued.push(callback); return queued.length })
		document.body.innerHTML = '<div id="modal"><button id="close">Close</button></div><div data-modal-focus-allow><button id="tag">Tag</button></div>'
		const modal = document.getElementById('modal')!
		const tag = document.getElementById('tag')!
		const controller = createModalFocusController({getContainer: () => modal})
		controller.setOpen(true)
		queued.splice(0).forEach((callback) => callback(0))
		controller.handleFocusin(new FocusEvent('focusin'))
		const event = new FocusEvent('focusin')
		Object.defineProperty(event, 'target', {value: document.body})
		controller.handleFocusin(event)
		tag.focus()
		queued.splice(0).forEach((callback) => callback(0))
		expect(document.activeElement).toBe(tag)
		controller.destroy()
	})

	it('restores a replaced table opener by its stable identity after saving a drawer', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 0 })
		const opener = document.createElement('button')
		opener.dataset.focusRestoreKey = 'entity-table:People:contact-id:name'
		document.body.append(opener)
		const replacement = opener.cloneNode(true) as HTMLButtonElement
		opener.replaceWith(replacement)
		restoreFocus(opener)
		expect(document.activeElement).toBe(replacement)
		replacement.disabled = true
		const other = document.createElement('button')
		document.body.append(other)
		other.focus()
		restoreFocus(opener)
		expect(document.activeElement).toBe(other)
	})
	it('returns to the surrounding list when a confirmed deletion removes its opener', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 0 })
		document.body.innerHTML = '<main><button id="search">Search</button><button id="delete">Delete</button></main><div id="modal"><button>Confirm</button></div>'
		const opener = document.getElementById('delete')!
		opener.focus()
		const controller = createModalFocusController({getContainer: () => document.getElementById('modal')})
		controller.setOpen(true)
		opener.remove()
		document.getElementById('modal')!.remove()
		controller.setOpen(false)
		expect(document.activeElement).toBe(document.getElementById('search'))
	})
	it('returns to main after deleting a nested drawer and clearing its selection query', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 0 })
		document.body.innerHTML = '<main><button id="search">Search</button></main><div role="dialog"><button id="delete">Delete</button></div><div id="confirm"><button>Confirm</button></div>'
		window.history.replaceState({}, '', '/forms?submissionId=owned')
		const opener = document.getElementById('delete')!
		opener.focus()
		const controller = createModalFocusController({getContainer: () => document.getElementById('confirm')})
		controller.setOpen(true)
		opener.closest('[role="dialog"]')!.remove()
		document.getElementById('confirm')!.remove()
		window.history.replaceState({}, '', '/forms')
		controller.setOpen(false)
		expect(document.activeElement).toBe(document.getElementById('search'))
		window.history.replaceState({}, '', '/')
	})
	it('returns an automatically opened modal to main content when its original focus was body', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 0 })
		document.body.innerHTML = '<main><button id="main-control">Content action</button></main>'
		document.body.tabIndex = -1
		document.body.focus()
		restoreFocus(document.body, document.querySelector('main'))
		expect(document.activeElement).toBe(document.getElementById('main-control'))
	})

	it('does not replace a new focus target with the deleted opener fallback', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 0 })
		document.body.innerHTML = '<main><button id="search">Search</button><button id="delete">Delete</button></main><button id="next">Next</button>'
		const opener = document.getElementById('delete')!, scope = document.querySelector('main')!
		opener.remove()
		document.getElementById('next')!.focus()
		restoreFocus(opener, scope)
		expect(document.activeElement).toBe(document.getElementById('next'))
	})
	it('returns only rendered, enabled, accessible focus targets', () => {
		document.body.innerHTML = `
      <div id="root">
        <button id="enabled">Enabled</button>
        <input id="input" />
        <select id="select"><option>One</option></select>
        <textarea id="textarea"></textarea>
        <button id="disabled" disabled>Disabled</button>
        <input id="hidden-input" type="hidden" />
        <a id="link" href="/x">Link</a>
        <button id="hidden" hidden>Hidden</button>
        <button id="display-none" style="display: none">Display none</button>
        <button id="visibility-hidden" style="visibility: hidden">Visibility hidden</button>
        <button id="tab-negative" tabindex="-1">Skip</button>
        <span aria-hidden="true"><button id="aria-hidden">Hidden from AT</button></span>
        <span inert><button id="inert-child">Inert</button></span>
      </div>
    `

		const root = document.getElementById('root') as HTMLElement
		expect(getFocusableElements(root).map((element) => element.id)).toEqual([
			'enabled',
			'input',
			'select',
			'textarea',
			'link'
		])
	})

	it('wraps Tab and Shift+Tab inside the container', () => {
		document.body.innerHTML = `
      <div id="root">
        <button id="first">First</button>
        <button id="last">Last</button>
      </div>
    `

		const root = document.getElementById('root') as HTMLElement
		const first = document.getElementById('first') as HTMLButtonElement
		const last = document.getElementById('last') as HTMLButtonElement

		last.focus()
		const forward = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})
		expect(trapTabKey(forward, root)).toBe(true)
		expect(forward.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(first)

		first.focus()
		const backward = new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true, cancelable: true})
		expect(trapTabKey(backward, root)).toBe(true)
		expect(backward.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(last)

		const nonTab = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})
		expect(trapTabKey(nonTab, root)).toBe(false)
		expect(nonTab.defaultPrevented).toBe(false)
	})

	it('falls back to container focus when no focusable child exists', () => {
		document.body.innerHTML = '<div id="root" tabindex="-1"><span>Empty</span></div>'
		const root = document.getElementById('root') as HTMLElement

		const forward = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})
		expect(trapTabKey(forward, root)).toBe(true)
		expect(forward.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(root)

		expect(trapTabKey(new KeyboardEvent('keydown', {key: 'Tab'}), null)).toBe(false)
		expect(getFocusableElements(null)).toEqual([])
	})

	it('keeps Tab inside when current focus starts outside the container', () => {
		document.body.innerHTML = `
      <button id="outside">Outside</button>
      <div id="root">
        <button id="first">First</button>
        <button id="last">Last</button>
      </div>
    `
		const root = document.getElementById('root') as HTMLElement
		const outside = document.getElementById('outside') as HTMLButtonElement
		const first = document.getElementById('first') as HTMLButtonElement
		const last = document.getElementById('last') as HTMLButtonElement

		outside.focus()
		const backward = new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, cancelable: true})
		expect(trapTabKey(backward, root)).toBe(true)
		expect(document.activeElement).toBe(last)

		outside.focus()
		const forward = new KeyboardEvent('keydown', {key: 'Tab', cancelable: true})
		expect(trapTabKey(forward, root)).toBe(true)
		expect(document.activeElement).toBe(first)
	})

	it('focuses a preferred initial target and ignores removed restore targets', () => {
		const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Origin</button>
      <div id="root" tabindex="-1">
        <button id="first">First</button>
        <button id="preferred">Preferred</button>
      </div>
    `

		const root = document.getElementById('root') as HTMLElement
		const origin = document.getElementById('origin') as HTMLButtonElement
		const preferred = document.getElementById('preferred') as HTMLButtonElement

		focusInitialTarget(root, preferred)
		expect(document.activeElement).toBe(preferred)

		preferred.disabled = true
		focusInitialTarget(root, preferred)
		expect(document.activeElement).toBe(document.getElementById('first'))

		const outside = document.createElement('button')
		document.body.append(outside)
		focusInitialTarget(root, outside)
		expect(document.activeElement).toBe(document.getElementById('first'))

		focusInitialTarget(null, preferred)
		expect(document.activeElement).toBe(document.getElementById('first'))

		origin.remove()
		restoreFocus(origin)
		expect(document.activeElement).toBe(document.getElementById('first'))
		restoreFocus(null)
		expect(document.activeElement).toBe(document.getElementById('first'))

		raf.mockRestore()
	})

	it('owns modal focus, isolates background content, and restores opener focus', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Open</button>
      <main id="page"><button id="behind">Behind</button></main>
      <div id="modal" tabindex="-1"><button id="first">First</button><button id="last">Last</button></div>
    `

		const origin = document.getElementById('origin') as HTMLButtonElement
		const page = document.getElementById('page') as HTMLElement
		const modal = document.getElementById('modal') as HTMLElement
		const first = document.getElementById('first') as HTMLButtonElement
		const last = document.getElementById('last') as HTMLButtonElement
		const onEscape = vi.fn()

		origin.focus()
		const controller = createModalFocusController({
			getContainer: () => modal,
			getRoot: () => modal,
			onEscape
		})

		controller.setOpen(true)

		expect(document.activeElement).toBe(first)
		expect(page.inert).toBe(true)
		expect(page.getAttribute('aria-hidden')).toBe('true')

		last.focus()
		const forward = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})
		controller.handleKeydown(forward)
		expect(forward.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(first)

		const escape = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})
		controller.handleKeydown(escape)
		expect(escape.defaultPrevented).toBe(true)
		expect(onEscape).toHaveBeenCalledTimes(1)

		controller.setOpen(false)

		expect(Boolean(page.inert)).toBe(false)
		expect(page.hasAttribute('aria-hidden')).toBe(false)
		expect(document.activeElement).toBe(origin)

		controller.setOpen(false)
		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))
		expect(onEscape).toHaveBeenCalledTimes(1)
	})

	it('restores pre-existing inert and aria-hidden values after modal isolation', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <section id="sibling-hidden" aria-hidden="false"><button>Hidden sibling</button></section>
      <section id="sibling-inert" inert><button>Inert sibling</button></section>
      <div id="modal-root"><div id="modal" tabindex="-1"><button id="first">First</button></div></div>
    `

		const siblingHidden = document.getElementById('sibling-hidden') as HTMLElement
		const siblingInert = document.getElementById('sibling-inert') as HTMLElement
		siblingInert.inert = true
		const modal = document.getElementById('modal') as HTMLElement
		const controller = createModalFocusController({
			getContainer: () => modal,
			getRoot: () => document.getElementById('modal-root') as HTMLElement
		})

		controller.setOpen(true)
		expect(siblingHidden.inert).toBe(true)
		expect(siblingHidden.getAttribute('aria-hidden')).toBe('true')
		expect(siblingInert.inert).toBe(true)
		expect(siblingInert.getAttribute('aria-hidden')).toBe('true')

		controller.setOpen(false)
		expect(Boolean(siblingHidden.inert)).toBe(false)
		expect(siblingHidden.getAttribute('aria-hidden')).toBe('false')
		expect(Boolean(siblingInert.inert)).toBe(true)
		expect(siblingInert.hasAttribute('aria-hidden')).toBe(false)
	})

	it('does not activate a modal until connected elements are available', () => {
		document.body.innerHTML = '<button id="origin">Open</button>'
		const origin = document.getElementById('origin') as HTMLButtonElement
		const onEscape = vi.fn()
		origin.focus()

		const controller = createModalFocusController({
			getContainer: () => document.getElementById('modal') as HTMLElement | null,
			getRoot: () => document.getElementById('modal') as HTMLElement | null,
			onEscape
		})

		controller.setOpen(true)
		expect(controller.isActive()).toBe(false)
		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))
		expect(onEscape).not.toHaveBeenCalled()

		document.body.insertAdjacentHTML('beforeend', '<div id="modal" tabindex="-1"><button id="first">First</button></div>')
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})
		controller.setOpen(true)
		expect(controller.isActive()).toBe(true)
		controller.destroy()
	})

	it('redirects outside focus back into the top modal and honors no-restore destroy options', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Open</button>
      <button id="outside">Outside</button>
      <div id="modal" tabindex="-1"><button id="initial">Initial</button></div>
    `

		const origin = document.getElementById('origin') as HTMLButtonElement
		const outside = document.getElementById('outside') as HTMLButtonElement
		const modal = document.getElementById('modal') as HTMLElement
		const initial = document.getElementById('initial') as HTMLButtonElement

		origin.focus()
		const controller = createModalFocusController({
			getContainer: () => modal,
			getRoot: () => modal,
			getInitialFocus: () => initial,
			shouldRestoreFocus: () => false
		})

		controller.setOpen(true)
		expect(document.activeElement).toBe(initial)

		outside.focus()
		const focusEvent = new FocusEvent('focusin', {bubbles: true})
		Object.defineProperty(focusEvent, 'target', {value: outside})
		controller.handleFocusin(focusEvent)
		expect(document.activeElement).toBe(initial)

		const insideEvent = new FocusEvent('focusin', {bubbles: true})
		Object.defineProperty(insideEvent, 'target', {value: initial})
		controller.handleFocusin(insideEvent)
		expect(document.activeElement).toBe(initial)

		const nonNodeEvent = new FocusEvent('focusin', {bubbles: true})
		Object.defineProperty(nonNodeEvent, 'target', {value: {id: 'not-a-node'}})
		controller.handleFocusin(nonNodeEvent)
		expect(document.activeElement).toBe(initial)

		controller.destroy()
		expect(document.activeElement).toBe(initial)
	})

	it('only lets the top modal in a stack handle Escape', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Open</button>
      <div id="first-modal" tabindex="-1"><button>First modal</button></div>
      <div id="second-modal" tabindex="-1"><button>Second modal</button></div>
    `

		const firstModal = document.getElementById('first-modal') as HTMLElement
		const secondModal = document.getElementById('second-modal') as HTMLElement
		const firstEscape = vi.fn()
		const secondEscape = vi.fn()
		const first = createModalFocusController({
			getContainer: () => firstModal,
			getRoot: () => firstModal,
			onEscape: firstEscape
		})
		const second = createModalFocusController({
			getContainer: () => secondModal,
			getRoot: () => secondModal,
			onEscape: secondEscape
		})

		first.setOpen(true)
		second.setOpen(true)

		first.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))
		second.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))

		expect(firstEscape).not.toHaveBeenCalled()
		expect(secondEscape).toHaveBeenCalledTimes(1)

		second.destroy()
		first.destroy()
	})

	it('can manage non-modal popover focus without inerting the page', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Open</button>
      <main id="page"><button id="behind">Behind</button></main>
      <div id="popover"><input id="search" /></div>
    `

		const origin = document.getElementById('origin') as HTMLButtonElement
		const page = document.getElementById('page') as HTMLElement
		const popover = document.getElementById('popover') as HTMLElement
		const input = document.getElementById('search') as HTMLInputElement
		const onEscape = vi.fn()

		origin.focus()
		const controller = createPopoverFocusController({
			getContainer: () => popover,
			getInitialFocus: () => input,
			onEscape
		})

		controller.setOpen(true)

		expect(document.activeElement).toBe(input)
		expect(Boolean(page.inert)).toBe(false)
		expect(page.hasAttribute('aria-hidden')).toBe(false)

		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))
		expect(onEscape).toHaveBeenCalledTimes(1)

		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Tab', cancelable: true}))
		expect(onEscape).toHaveBeenCalledTimes(1)

		controller.setOpen(false)
		expect(document.activeElement).toBe(origin)
		controller.setOpen(false)
		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))
		expect(onEscape).toHaveBeenCalledTimes(1)
	})

	it('restores popover focus to an explicit target and ignores non-Escape keys', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Open</button>
      <button id="restore">Restore</button>
      <div id="popover"><button id="first">First</button></div>
    `

		const origin = document.getElementById('origin') as HTMLButtonElement
		const restore = document.getElementById('restore') as HTMLButtonElement
		const popover = document.getElementById('popover') as HTMLElement
		const first = document.getElementById('first') as HTMLButtonElement
		const onEscape = vi.fn()

		origin.focus()
		const controller = createPopoverFocusController({
			getContainer: () => popover,
			getInitialFocus: () => first,
			getRestoreFocusTo: () => restore,
			onEscape
		})

		controller.setOpen(true)
		expect(document.activeElement).toBe(first)

		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Tab', cancelable: true}))
		expect(onEscape).not.toHaveBeenCalled()

		controller.setOpen(false)
		expect(document.activeElement).toBe(restore)
	})

	it('ignores disconnected popovers and inactive Escape handling', () => {
		const onEscape = vi.fn()
		const controller = createPopoverFocusController({
			getContainer: () => document.getElementById('missing'),
			onEscape
		})

		controller.setOpen(true)
		controller.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}))
		expect(onEscape).not.toHaveBeenCalled()
		controller.destroy()
	})

	it('destroys active popovers without restoring focus when configured', () => {
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
			callback(0)
			return 0
		})

		document.body.innerHTML = `
      <button id="origin">Open</button>
      <div id="popover"><button id="first">First</button></div>
    `

		const origin = document.getElementById('origin') as HTMLButtonElement
		const popover = document.getElementById('popover') as HTMLElement
		const first = document.getElementById('first') as HTMLButtonElement

		origin.focus()
		const controller = createPopoverFocusController({
			getContainer: () => popover,
			getInitialFocus: () => first,
			shouldRestoreFocus: () => false
		})

		controller.setOpen(true)
		expect(document.activeElement).toBe(first)
		controller.destroy()
		expect(document.activeElement).toBe(first)
	})
})
