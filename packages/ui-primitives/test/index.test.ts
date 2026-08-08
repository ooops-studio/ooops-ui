// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
	createDialogController,
	createInputController,
	createPopoverController,
	createSelectController
} from '../src/index'

beforeEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		callback(0)
		return 1
	})
	if (!globalThis.ResizeObserver) {
		globalThis.ResizeObserver = class {
			observe() {}
			disconnect() {}
			unobserve() {}
		} as unknown as typeof ResizeObserver
	}
})

const createSelectFixture = () => {
	document.body.innerHTML = `
    <form id="form">
      <div id="root">
        <button id="trigger" type="button" aria-expanded="false"></button>
        <select id="native" name="status"><option value=""></option><option value="draft">Draft</option><option value="published">Published</option></select>
      </div>
      <div id="listbox" role="listbox">
        <div id="option-0" data-ooops-select-option data-option-index="0" role="option">Draft</div>
        <div id="option-1" data-ooops-select-option data-option-index="1" role="option">Published</div>
      </div>
    </form>
  `
	return {
		root: document.getElementById('root') as HTMLElement,
		trigger: document.getElementById('trigger') as HTMLButtonElement,
		listbox: document.getElementById('listbox') as HTMLElement,
		native: document.getElementById('native') as HTMLSelectElement,
		form: document.getElementById('form') as HTMLFormElement
	}
}

describe('createInputController', () => {
	it('preserves user input entered before progressive enhancement mounts', () => {
		document.body.innerHTML = '<input value="server-default">'
		const input = document.querySelector('input') as HTMLInputElement
		input.value = 'typed-before-mount'
		const controller = createInputController({
			value: 'server-default',
			defaultValue: 'server-default',
			getElement: () => input
		})

		controller.mount()

		expect(controller.getState().value).toBe('typed-before-mount')
		expect(input.value).toBe('typed-before-mount')
		controller.destroy()
	})
})

describe('createSelectController', () => {
	it('synchronizes value, native form control and custom events', () => {
		const fixture = createSelectFixture()
		const onChange = vi.fn()
		const event = vi.fn()
		fixture.root.addEventListener('ooops:select-change', event)
		const controller = createSelectController({
			options: [{value: 'draft', label: 'Draft'}, {value: 'published', label: 'Published'}],
			defaultValue: 'draft',
			getRoot: () => fixture.root,
			getTrigger: () => fixture.trigger,
			getListbox: () => fixture.listbox,
			getNativeSelect: () => fixture.native,
			onChange
		})
		controller.mount()
		controller.open()
		controller.selectIndex(1)
		expect(controller.getState().value).toBe('published')
		expect(fixture.native.value).toBe('published')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({value: 'published'}))
		expect(event).toHaveBeenCalledOnce()
	})

	it('skips disabled options and supports keyboard navigation and typeahead', () => {
		const fixture = createSelectFixture()
		const controller = createSelectController({
			options: [
				{value: 'draft', label: 'Draft', disabled: true},
				{value: 'published', label: 'Published', group: 'Public', description: 'Visible'}
			],
			getRoot: () => fixture.root,
			getTrigger: () => fixture.trigger,
			getListbox: () => fixture.listbox,
			getNativeSelect: () => fixture.native
		})
		controller.mount()
		fixture.trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true}))
		expect(controller.getState()).toMatchObject({open: true, activeIndex: 1})
		fixture.trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'p', bubbles: true}))
		expect(controller.getState().activeIndex).toBe(1)
	})

	it('restores the default value on form reset', () => {
		const fixture = createSelectFixture()
		const controller = createSelectController({
			options: [{value: 'draft', label: 'Draft'}, {value: 'published', label: 'Published'}],
			defaultValue: 'draft',
			getRoot: () => fixture.root,
			getTrigger: () => fixture.trigger,
			getListbox: () => fixture.listbox,
			getNativeSelect: () => fixture.native
		})
		controller.mount()
		controller.setValue('published')
		fixture.form.dispatchEvent(new Event('reset'))
		expect(controller.getState().value).toBe('draft')
	})

})

describe('createDialogController', () => {
	it('opens, confirms and closes a modal dialog', async() => {
		document.body.innerHTML = '<button id="open">Open</button><div id="root"><dialog id="dialog"><button id="confirm">Confirm</button></dialog></div>'
		const root = document.getElementById('root') as HTMLElement
		const dialog = document.getElementById('dialog') as HTMLDialogElement
		const confirm = document.getElementById('confirm') as HTMLButtonElement
		dialog.showModal = vi.fn(() => { dialog.setAttribute('open', '') })
		dialog.close = vi.fn((reason?: string) => {
			dialog.returnValue = reason ?? ''
			dialog.removeAttribute('open')
			dialog.dispatchEvent(new Event('close'))
		})
		const onConfirm = vi.fn()
		const controller = createDialogController({
			getRoot: () => root,
			getDialog: () => dialog,
			getInitialFocus: () => confirm,
			onConfirm
		})
		controller.mount()
		controller.open()
		expect(controller.getState().open).toBe(true)
		await controller.confirm()
		expect(onConfirm).toHaveBeenCalledOnce()
		expect(controller.getState()).toMatchObject({open: false, closeReason: 'confirm'})
	})
})

describe('createPopoverController', () => {
	it('positions and dismisses on outside pointer', () => {
		document.body.innerHTML = '<div id="root"><button id="anchor">Open</button></div><div id="panel"></div><button id="outside">Outside</button>'
		const root = document.getElementById('root') as HTMLElement
		const anchor = document.getElementById('anchor') as HTMLButtonElement
		const panel = document.getElementById('panel') as HTMLElement
		const outside = document.getElementById('outside') as HTMLButtonElement
		vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({top: 20, bottom: 50, left: 20, right: 120, width: 100, height: 30, x: 20, y: 20, toJSON: () => ({})})
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({top: 0, bottom: 100, left: 0, right: 180, width: 180, height: 100, x: 0, y: 0, toJSON: () => ({})})
		const controller = createPopoverController({
			getRoot: () => root,
			getAnchor: () => anchor,
			getPanel: () => panel
		})
		controller.mount()
		controller.open()
		expect(panel.style.position).toBe('fixed')
		outside.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
		expect(controller.getState().open).toBe(false)
	})
})
