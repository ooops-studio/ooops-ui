// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createDialogController} from '../src/dialog'
import {createLayerController} from '../src/layer'

const dispose: Array<() => void> = []
afterEach(() => { dispose.reverse().forEach((fn) => fn()); dispose.length = 0; document.body.innerHTML = ''; vi.restoreAllMocks() })
it('keeps positioning under host ownership while sharing layer dismissal and focus rules', () => {
	document.body.innerHTML = '<button>Anchor</button><div style="position:fixed;left:42px;top:73px" hidden>Panel</div>'
	const anchor = document.querySelector('button')!, panel = document.querySelector('div')!
	const layer = createLayerController({
		getAnchor: () => anchor, getLayer: () => panel, positioning: false
	})
	dispose.push(() => layer.destroy()); layer.mount(); layer.open(); layer.update()
	expect(panel.style.left).toBe('42px'); expect(panel.style.top).toBe('73px')
	document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))
	expect(layer.isOpen()).toBe(false)
})
it('ports floating controls into their native modal top-layer boundary by default', () => {
	document.body.innerHTML = '<dialog open><button>Anchor</button></dialog><div hidden>Panel</div>'
	const anchor = document.querySelector('button')!, panel = document.querySelector('div')!
	const layer = createLayerController({getAnchor: () => anchor, getLayer: () => panel})
	dispose.push(() => layer.destroy()); layer.mount(); layer.open()
	expect(panel.parentElement).toBe(document.querySelector('dialog'))
})
it('can dismiss hover help without stealing focus from the user current control', () => {
	document.body.innerHTML = '<button id="anchor">Hover help</button><input><div hidden>Panel</div>'
	const anchor = document.querySelector('button')!, panel = document.querySelector('div')!, current = document.querySelector('input')!
	const layer = createLayerController({
		getAnchor: () => anchor, getLayer: () => panel, restoreFocusOnEscape: false
	})
	dispose.push(() => layer.destroy()); layer.mount(); layer.open(); current.focus()
	current.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))
	expect(layer.isOpen()).toBe(false); expect(document.activeElement).toBe(current)
})
it('can leave successful confirmation visibility under host ownership without dropping busy protection', async() => {
	document.body.innerHTML = '<section><button>Confirm</button></section>'
	const dialog = document.querySelector('section')!
	let resolve = () => {}
	const confirm = vi.fn(() => new Promise<void>((finish) => { resolve = finish }))
	const controller = createDialogController({
		getDialog: () => dialog, getRoot: () => dialog, onConfirm: confirm, closeOnConfirm: false
	})
	dispose.push(() => controller.destroy()); controller.mount(); controller.open()
	const pending = controller.confirm(); await controller.confirm()
	expect(confirm).toHaveBeenCalledOnce(); expect(controller.getState().busy).toBe(true)
	resolve(); await pending
	expect(controller.getState()).toMatchObject({open: true, busy: false})
	controller.close(); expect(controller.getState().open).toBe(false)
})

it('keeps a declined confirmation open without emitting a successful confirm event', async() => {
	document.body.innerHTML = '<section><button>Confirm</button></section>'
	const dialog = document.querySelector('section')!, confirmed = vi.fn()
	dialog.addEventListener('ooops:dialog-confirm', confirmed)
	const controller = createDialogController({
		getDialog: () => dialog, getRoot: () => dialog, onConfirm: async() => false
	})
	dispose.push(() => controller.destroy()); controller.mount(); controller.open()
	await controller.confirm()
	expect(controller.getState()).toMatchObject({open: true, busy: false})
	expect(dialog.getAttribute('aria-busy')).toBe('false')
	expect(confirmed).not.toHaveBeenCalled()
})
