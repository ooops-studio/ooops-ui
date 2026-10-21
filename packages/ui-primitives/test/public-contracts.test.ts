// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest'

import {connectOverlayTrigger, createDialogController, createMultiSelectController, createMenuController, createPopoverController, getFieldControlAttributes} from '../src/index'

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })
describe('consumer contracts', () => {
	it('guards disabled multi-select user actions and restores them after enable', () => {
		document.body.innerHTML = '<div><input><span data-part="chip"><button data-remove-value="a">Remove</button></span></div><div id="list"></div>'
		const root = document.querySelector('div')!, input = document.querySelector('input')!
		const onChange = vi.fn()
		const control = createMultiSelectController({options: [{value: 'a', label: 'A'}, {value: 'b', label: 'B'}], values: ['a'], disabled: true, getRoot: () => root, getInput: () => input, getListbox: () => document.querySelector('#list'), getOptions: () => [], onChange})
		control.mount()
		input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Backspace', bubbles: true}))
		root.querySelector('button')!.click()
		control.toggleValue('b')
		control.clear()
		control.selectAll()
		expect(control.getState().values).toEqual(['a']); expect(onChange).not.toHaveBeenCalled()
		control.setDisabled(false); root.querySelector('button')!.click()
		expect(control.getState().values).toEqual([]); expect(onChange).toHaveBeenCalledTimes(1)
		control.destroy()
	})
	it('generates field associations with error precedence and explicit pending state', () => {
		expect(getFieldControlAttributes({id: 'email', controlId: 'mail', description: 'Description', hint: 'Hint', error: 'Invalid', pending: true, disabled: true, required: true})).toEqual({id: 'mail', required: true, disabled: true, 'aria-describedby': 'email-description email-error', 'aria-invalid': 'true', 'aria-busy': 'true'})
		expect(getFieldControlAttributes({id: 'email', hint: 'Hint'})['aria-describedby']).toBe('email-hint')
		expect(getFieldControlAttributes({id: 'email'})).toMatchObject({id: 'email-control', disabled: false, required: false})
	})
	it('serializes async confirmation and keeps a rejected dialog open', async() => {
		document.body.innerHTML = '<div id="root"><div id="dialog"></div></div>'
		let resolve = () => {}
		const task = new Promise<void>((done) => { resolve = done })
		const onConfirm = vi.fn(() => task), onConfirmError = vi.fn()
		let allow = false
		const c = createDialogController({getRoot: () => document.querySelector('#root'), getDialog: () => document.querySelector('#dialog'), onConfirm, onConfirmError, beforeClose: () => allow})
		c.mount(); c.open()
		const first = c.confirm(); c.setBusy(false); await c.confirm(); c.close('escape')
		expect(onConfirm).toHaveBeenCalledTimes(1)
		expect(c.getState()).toMatchObject({open: true,
			busy: true})
		resolve(); await first
		expect(c.getState()).toMatchObject({open: true, busy: false})
		allow = true; c.close('cancel'); expect(c.getState().open).toBe(false); c.destroy()
		const error = new Error('Save failed')
		const rejected = createDialogController({getRoot: () => document.querySelector('#root'), getDialog: () => document.querySelector('#dialog'), onConfirm: () => Promise.reject(error), onConfirmError})
		rejected.mount(); rejected.open(); await rejected.confirm()
		expect(rejected.getState()).toMatchObject({open: true,
			busy: false})
		expect(onConfirmError).toHaveBeenCalledWith(error)
		rejected.destroy()
	})
	it('positions external-anchor popovers in a custom portal and respects close veto', () => {
		document.body.innerHTML = '<button id="anchor">Open</button><div id="owner"></div><div id="portal"></div><div id="panel"></div>'
		let allow = false
		const panel = document.querySelector<HTMLElement>('#panel')!, anchor = document.querySelector<HTMLElement>('#anchor')!
		const c = createPopoverController({getRoot: () => document.querySelector('#owner'), getAnchor: () => anchor, getPanel: () => panel, portal: true, getPortalRoot: () => document.querySelector('#portal'), matchAnchorWidth: true, zIndex: 47, beforeClose: () => allow})
		c.mount(); c.open()
		expect(panel.parentElement?.id).toBe('portal')
		expect(anchor.getAttribute('aria-expanded')).toBe('true')
		expect(panel.style.zIndex).toBe('47'); c.close('escape'); expect(c.getState().open).toBe(true)
		allow = true; c.close(); expect(c.getState().open).toBe(false); c.destroy()
	})
	it('restores external trigger attributes and forces cleanup despite a dismissal veto', () => {
		document.body.innerHTML = '<button aria-controls="original" aria-expanded="mixed"></button><div id="panel"></div>'
		const anchor = document.querySelector('button')!, panel = document.querySelector<HTMLElement>('#panel')!
		const restore = connectOverlayTrigger(anchor, 'panel', 'dialog')
		const c = createPopoverController({
			getRoot: () => null, getAnchor: () => anchor,
			getPanel: () => panel, beforeClose: () => false
		})
		c.mount()
		c.open()
		c.destroy()
		restore()
		expect(panel.hidden).toBe(true); expect(anchor.getAttribute('aria-controls')).toBe('original')
		expect(anchor.getAttribute('aria-expanded')).toBe('mixed')
		expect(anchor.hasAttribute('aria-haspopup')).toBe(false)
	})
	it('configures external-anchor menus and preserves open state when dismiss is vetoed', () => {
		document.body.innerHTML = '<button id="anchor">Open</button><div id="menu" role="menu"><button role="menuitem">Action</button></div>'
		const anchor = document.querySelector<HTMLButtonElement>('#anchor')!, menu = document.querySelector<HTMLElement>('#menu')!
		let allow = false
		const onOpenChange = vi.fn()
		const c = createMenuController({placement: 'top', align: 'end', offset: 0, zIndex: 71, matchAnchorWidth: true, portal: false, getTrigger: () => anchor, getMenu: () => menu, getItems: () => [...menu.querySelectorAll<HTMLElement>('button')], beforeClose: () => allow, onOpenChange})
		c.mount(); anchor.click()
		expect(c.getState().open).toBe(true); expect(menu.style.zIndex).toBe('71')
		c.close()
		expect(c.getState().open).toBe(true)
		expect(onOpenChange).toHaveBeenLastCalledWith(true)
		allow = true; c.close(); expect(c.getState().open).toBe(false); c.destroy()
		const restore = connectOverlayTrigger(anchor, 'menu', 'region')
		expect(anchor.getAttribute('aria-haspopup')).toBe('false'); restore()
	})

	it('guards native dialog.close and busy close events without double-checking an approved close', () => {
		document.body.innerHTML = '<button id="restore">Restore</button><div><dialog><button>Inside</button></dialog></div>'
		const dialog = document.querySelector('dialog')!
		dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''))
		dialog.close = vi.fn((reason = '') => { dialog.returnValue = reason; dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')) })
		let allow = false
		const beforeClose = vi.fn(() => allow), onClose = vi.fn()
		const c = createDialogController({
			getRoot: () => dialog.parentElement, getDialog: () => dialog,
			beforeClose, onClose
		})
		c.mount(); c.open(); dialog.close('external')
		expect(dialog.open).toBe(true)
		expect(c.getState().open).toBe(true)
		expect(onClose).not.toHaveBeenCalled()
		c.setBusy(true); dialog.close('external'); expect(dialog.open).toBe(true)
		c.setBusy(false); allow = true; dialog.close('external')
		expect(c.getState().open).toBe(false); expect(onClose).toHaveBeenCalledExactlyOnceWith('external')
		c.open(); beforeClose.mockClear(); c.close('cancel')
		expect(beforeClose).toHaveBeenCalledTimes(1); expect(dialog.open).toBe(false); c.destroy()
	})
	it('does not emit confirmation after teardown while a save is pending', async() => {
		document.body.innerHTML = '<div id="owner"><div id="dialog"></div></div>'
		let resolve = () => {}
		const pending = new Promise<void>((done) => { resolve = done })
		const owner = document.querySelector<HTMLElement>('#owner')!, emitted = vi.fn()
		owner.addEventListener('ooops:dialog-confirm', emitted)
		const c = createDialogController({getRoot: () => owner, getDialog: () => document.querySelector('#dialog'), onConfirm: () => pending})
		c.mount(); c.open(); const save = c.confirm(); c.destroy(); resolve(); await save
		expect(c.getState().mounted).toBe(false); expect(emitted).not.toHaveBeenCalled()
	})

})
