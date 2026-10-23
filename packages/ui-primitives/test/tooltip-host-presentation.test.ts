// @vitest-environment jsdom
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createTooltipController} from '../src/menu'

let controller: ReturnType<typeof createTooltipController> | undefined
beforeEach(() => {
	vi.useFakeTimers()
	document.body.innerHTML = '<button id="trigger" aria-describedby="existing">Help</button><input>'
	Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: false})})
})
afterEach(() => { controller?.destroy(); controller = undefined; vi.useRealTimers(); document.body.innerHTML = '' })
const trigger = () => document.querySelector<HTMLButtonElement>('#trigger')!
const enter = () => trigger().dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}))
const setup = (extra: Partial<Parameters<typeof createTooltipController>[0]> = {}) => {
	let tooltip: HTMLElement | null = null
	const changes = vi.fn((open: boolean) => { if (!open) { tooltip?.remove(); tooltip = null } })
	controller = createTooltipController({
		getTrigger: trigger, getTooltip: () => tooltip, portal: false, positioning: false,
		describeWhenOpen: true, openDelayMs: 20, closeDelayMs: 10,
		onBeforeOpen: () => {
			tooltip = document.createElement('div'); tooltip.id = 'lazy-help'
			tooltip.style.left = '42px'; tooltip.textContent = 'Host styling'
			document.body.appendChild(tooltip)
		}, onOpenChange: changes, ...extra
	})
	controller.mount()
	return {controller, changes, tooltip: () => tooltip}
}
it('owns lazy presentation activation and ARIA without changing host geometry or retaining disposed nodes', () => {
	const c = setup()
	expect(c.tooltip()).toBeNull(); expect(trigger().getAttribute('aria-describedby')).toBe('existing')
	enter(); vi.advanceTimersByTime(20)
	const first = c.tooltip()!
	expect(first.style.left).toBe('42px'); expect(trigger().getAttribute('aria-describedby')).toBe('existing lazy-help')
	controller!.dismiss()
	expect(c.tooltip()).toBeNull(); expect(trigger().getAttribute('aria-describedby')).toBe('existing')
	enter(); vi.advanceTimersByTime(20)
	expect(c.tooltip()).not.toBe(first)
	controller!.destroy()
	expect(c.tooltip()).toBeNull()
	expect(c.changes.mock.calls.map((call) => call[0])).toEqual([true, false, true, false])
})
it('activates keyboard-only help after navigation rather than modal initial focus and dismisses activation immediately', () => {
	setup({focusMode: 'keyboard', dismissOnInteraction: true})
	trigger().focus(); vi.advanceTimersByTime(40)
	expect(controller!.getState().open).toBe(false)
	document.querySelector('input')!.focus()
	document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}))
	trigger().focus(); vi.advanceTimersByTime(20)
	expect(controller!.getState().open).toBe(true)
	document.querySelector('input')!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
	expect(controller!.getState().open).toBe(false)
	enter(); vi.advanceTimersByTime(20); trigger().click()
	expect(controller!.getState().open).toBe(false)
})
it('rechecks disabled or expanded suppression after the delay and on refresh', () => {
	let allowed = true
	setup({shouldOpen: () => allowed})
	enter(); allowed = false; vi.advanceTimersByTime(20)
	expect(controller!.getState().open).toBe(false)
	enter(); vi.advanceTimersByTime(20)
	expect(controller!.getState().open).toBe(false)
	allowed = true; enter(); vi.advanceTimersByTime(20)
	expect(controller!.getState().open).toBe(true)
	controller!.refresh(); allowed = false; controller!.refresh()
	expect(controller!.getState().open).toBe(false)
})
it('dismisses scrolling and resizing without retaining listeners after teardown', () => {
	const c = setup({dismissOnInteraction: true})
	enter(); vi.advanceTimersByTime(20); window.dispatchEvent(new Event('scroll'))
	expect(controller!.getState().open).toBe(false)
	enter(); vi.advanceTimersByTime(20); window.dispatchEvent(new Event('resize'))
	expect(controller!.getState().open).toBe(false)
	controller!.destroy(); const calls = c.changes.mock.calls.length
	window.dispatchEvent(new Event('scroll')); trigger().click()
	expect(c.changes).toHaveBeenCalledTimes(calls)
})
