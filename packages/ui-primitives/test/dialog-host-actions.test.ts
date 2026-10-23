// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createDialogController} from '../src/dialog'

let controller:ReturnType<typeof createDialogController>|undefined
afterEach(() => {controller?.destroy();controller = undefined;document.body.innerHTML = '';vi.restoreAllMocks()})
const setup = (onError = vi.fn()) => {
	document.body.innerHTML = '<button id="outside">Outside</button><section data-state="host-owned"><button>Close</button></section>'
	const panel = document.querySelector('section')!, outside = document.getElementById('outside')!
	outside.focus()
	controller = createDialogController({
		getRoot:() => panel,
		getDialog:() => panel,
		manageFocus:false,
		manageVisibility:false,
		closeOnConfirm:false,
		onActionError:onError
	})
	controller.mount();controller.open()
	return {controller, panel, outside}
}
it('shares async action state without a second focus or visibility owner', async() => {
	const {controller, panel, outside} = setup()
	expect(document.activeElement).toBe(outside);expect(panel.hasAttribute('aria-modal')).toBe(false)
	expect(panel.dataset.state).toBe('host-owned');expect(outside.inert).not.toBe(true)
	let resolve = () => {}
	const action = vi.fn(() => new Promise<void>((finish) => {resolve = finish}))
	const pending = controller.runAction(action, 'cancel')
	expect(panel.getAttribute('aria-busy')).toBe('true')
	expect(await controller.runAction(action, 'confirm')).toBe(false);expect(action).toHaveBeenCalledOnce()
	resolve();expect(await pending).toBe(true)
	controller.close();expect(panel.hidden).toBe(false);expect(panel.dataset.state).toBe('host-owned')
})
it('reports cancel/close errors once, resets busy and remains usable for retry', async() => {
	const onError = vi.fn(), {controller} = setup(onError), error = new Error('Cannot close yet')
	expect(await controller.runAction(async() => {throw error}, 'cancel')).toBe(false)
	expect(onError).toHaveBeenCalledExactlyOnceWith(error, 'cancel')
	expect(controller.getState()).toMatchObject({open:true, busy:false})
	expect(await controller.runAction(async() => true, 'cancel')).toBe(true)
})
it('ignores completion after the controlled host closes during its own callback', async() => {
	const {controller} = setup()
	expect(await controller.runAction(async() => {controller.destroy()}, 'confirm')).toBe(false)
	expect(controller.getState()).toMatchObject({open:false, mounted:false})
})
