// @vitest-environment jsdom
import {afterEach, expect, it} from 'vitest'

import {createFocusTrap} from '../src/focus-trap'

let trap: ReturnType<typeof createFocusTrap> | undefined
afterEach(() => { trap?.destroy(); trap = undefined; document.body.innerHTML = '' })
it('honors explicit initial focus after native showModal has already autofocus-selected another control', () => {
	document.body.innerHTML = '<section><input><button>Cancel</button></section>'
	const container = document.querySelector('section')!
	const preferred = container.querySelector('button')!
	container.querySelector('input')!.focus()
	trap = createFocusTrap({
		modal: true, getContainer: () => container, getInitialFocus: () => preferred
	})
	trap.activate()
	expect(document.activeElement).toBe(preferred)
})
