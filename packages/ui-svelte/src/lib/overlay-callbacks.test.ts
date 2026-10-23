import {cleanup, fireEvent, render, waitFor} from '@testing-library/svelte'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import Dialog from './Dialog.svelte'
import Drawer from './Drawer.svelte'
import Modal from './Modal.svelte'

const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeEach(() => {
	Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
		configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', '') }
	})
	Object.defineProperty(HTMLDialogElement.prototype, 'close', {
		configurable: true, value(this: HTMLDialogElement, value?: string) {
			this.returnValue = value ?? ''
			this.removeAttribute('open')
			this.dispatchEvent(new Event('close'))
		}
	})
})
afterEach(() => {
	cleanup(); vi.restoreAllMocks(); document.body.innerHTML = ''
	if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShow)
	else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
	if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
	else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

it('uses the latest Dialog confirm and close callbacks without remounting its active modal', async() => {
	const oldConfirm = vi.fn(), oldClose = vi.fn(), confirm = vi.fn(), close = vi.fn()
	const view = render(Dialog, {open: true, title: 'Confirm', onConfirm: oldConfirm, onClose: oldClose})
	const dialog = view.container.querySelector('dialog')!
	await view.rerender({onConfirm: confirm, onClose: close})
	await fireEvent.click(view.getByRole('button', {name: 'Confirm'}))
	await waitFor(() => expect(confirm).toHaveBeenCalledOnce())
	expect(oldConfirm).not.toHaveBeenCalled()
	expect(close).toHaveBeenCalledExactlyOnceWith('confirm')
	expect(oldClose).not.toHaveBeenCalled()
	expect(view.container.querySelector('dialog')).toBe(dialog)
})

it('reacts to changed Escape dismissal policy in an already-open Modal', async() => {
	const close = vi.fn()
	const view = render(Modal, {open: true, title: 'Details', closeOnEscape: false, onClose: close})
	const button = view.getByRole('button', {name: 'Close dialog'})
	await fireEvent.keyDown(button, {key: 'Escape'})
	expect(close).not.toHaveBeenCalled()
	await view.rerender({closeOnEscape: true})
	await fireEvent.keyDown(button, {key: 'Escape'})
	expect(close).toHaveBeenCalledExactlyOnceWith('escape')
})

it('passes updated modal Drawer callbacks through the composed Modal adapter', async() => {
	const oldClose = vi.fn(), close = vi.fn()
	const view = render(Drawer, {open: true, title: 'Drawer details', onClose: oldClose})
	await view.rerender({onClose: close})
	await fireEvent.click(view.getByRole('button', {name: 'Close dialog'}))
	expect(close).toHaveBeenCalledExactlyOnceWith('close')
	expect(oldClose).not.toHaveBeenCalled()
})
