// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createDialogController} from '../src/dialog'
import {createLayerController} from '../src/layer'

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})
for (const layerFirst of [true, false]) {
	it(`dismisses only the nested layer per Escape with layer-first=${layerFirst}`, () => {
		document.body.innerHTML =
			'<button id="opener">Open</button><div id="root"><div id="dialog"><button id="month">Month</button><div id="menu" hidden><button>January</button></div></div></div>'
		const container = document.querySelector<HTMLElement>('#dialog')!
		const anchor = document.querySelector<HTMLElement>('#month')!
		const menu = document.querySelector<HTMLElement>('#menu')!
		const dialog = createDialogController({
			getRoot: () => document.querySelector('#root'),
			getDialog: () => container,
			getRestoreFocusTo: () => document.querySelector('#opener')
		})
		const layer = createLayerController({
			getAnchor: () => anchor,
			getLayer: () => menu,
			portal: false
		})
		try {
			if (layerFirst) layer.mount()
			dialog.mount()
			dialog.open()
			if (!layerFirst) layer.mount()
			layer.open()
			menu.querySelector('button')!.focus()
			menu.dispatchEvent(
				new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})
			)
			expect(layer.isOpen()).toBe(false)
			expect(dialog.getState().open).toBe(true)
			expect(document.activeElement).toBe(anchor)
			anchor.dispatchEvent(
				new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})
			)
			expect(dialog.getState().open).toBe(false)
		} finally {
			layer.destroy()
			dialog.destroy()
		}
	})
}
