// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {createDialogController} from '../src/dialog'

let controller: ReturnType<typeof createDialogController> | undefined
afterEach(() => { controller?.destroy(); controller = undefined; document.body.innerHTML = '' })
const setup = (confirm: () => Promise<void>, onError = vi.fn()) => {
	document.body.innerHTML = '<button id="open">Open</button><div id="root"><div id="dialog" role="dialog"><button>Confirm</button></div></div>'
	controller = createDialogController({getRoot: () => document.querySelector('#root'), getDialog: () => document.querySelector('#dialog'), onConfirm: confirm, onConfirmError: onError})
	controller.mount(); controller.open()
	return controller
}

it('does not emit error callbacks or mutate DOM when a pending confirmation rejects after teardown', async() => {
	let reject = (_error: Error) => {}
	const onError = vi.fn()
	const c = setup(() => new Promise<void>((_resolve, fail) => { reject = fail }), onError)
	const root = document.querySelector('#root')!
	const errorEvent = vi.fn(); root.addEventListener('ooops:dialog-error', errorEvent)
	const pending = c.confirm()
	c.destroy()
	root.setAttribute('data-busy', 'caller-owned')
	reject(new Error('Late failure')); await pending
	expect(onError).not.toHaveBeenCalled()
	expect(errorEvent).not.toHaveBeenCalled()
	expect(root.getAttribute('data-busy')).toBe('caller-owned')
})

it('ignores completion from a prior mounted lifetime when the controller has reopened', async() => {
	let resolve = () => {}
	const c = setup(() => new Promise<void>((finish) => { resolve = finish }))
	const pending = c.confirm()
	c.destroy(); c.mount(); c.open()
	resolve(); await pending
	expect(c.getState()).toMatchObject({mounted: true, open: true, busy: false})
})

it('allows a new confirmation after remount without the old promise clearing its busy state', async() => {
	const resolvers: Array<() => void> = []
	const c = setup(() => new Promise<void>((finish) => { resolvers.push(finish) }))
	const stale = c.confirm()
	c.destroy(); c.mount(); c.open()
	const current = c.confirm()
	expect(resolvers).toHaveLength(2)
	resolvers[0]!(); await stale
	expect(c.getState().busy).toBe(true)
	resolvers[1]!(); await current
	expect(c.getState()).toMatchObject({open: false, busy: false})
})
