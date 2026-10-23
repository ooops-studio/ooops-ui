// @vitest-environment jsdom
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createTooltipController} from '../src/menu'

let controller: ReturnType<typeof createTooltipController> | undefined
beforeEach(() => {
	vi.useFakeTimers()
	document.body.innerHTML = '<button id="trigger" aria-describedby="help">Help</button><div id="tip" role="tooltip" hidden>Details</div><button id="next">Next</button>'
	Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: false})})
})
afterEach(() => {
	controller?.destroy()
	controller = undefined
	vi.useRealTimers()
	document.body.innerHTML = ''
})
const trigger = () => document.querySelector<HTMLElement>('#trigger')!
const tip = () => document.querySelector<HTMLElement>('#tip')!
const setup = () => {
	controller = createTooltipController({
		getTrigger: trigger, getTooltip: tip, openDelayMs: 20, closeDelayMs: 10, portal: false
	})
	controller.mount()
	return controller
}
const enter = (node: HTMLElement) => node.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}))
const leave = (node: HTMLElement) => node.dispatchEvent(new PointerEvent('pointerleave', {pointerType: 'mouse'}))
const escape = () => trigger().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))

it('keeps the tooltip available when the pointer crosses from trigger into tooltip content', () => {
	const c = setup()
	enter(trigger()); vi.advanceTimersByTime(20)
	leave(trigger()); enter(tip()); vi.advanceTimersByTime(30)
	expect(c.getState().open).toBe(true)
	leave(tip()); vi.advanceTimersByTime(10)
	expect(c.getState().open).toBe(false)
})

it('does not hide a focused trigger tooltip merely because the pointer leaves', () => {
	const c = setup()
	trigger().focus(); vi.advanceTimersByTime(20)
	enter(trigger()); leave(trigger()); vi.advanceTimersByTime(30)
	expect(c.getState().open).toBe(true)
	document.querySelector<HTMLElement>('#next')!.focus(); vi.advanceTimersByTime(10)
	expect(c.getState().open).toBe(false)
})

it('cancels a pending open on Escape without consuming the enclosing modal Escape', () => {
	const c = setup()
	enter(trigger())
	const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})
	trigger().dispatchEvent(event); vi.advanceTimersByTime(50)
	expect(c.getState().open).toBe(false)
	expect(event.defaultPrevented).toBe(false)
})

it('does not reopen from restored anchor focus after a visible tooltip handles Escape', () => {
	const c = setup()
	enter(trigger()); vi.advanceTimersByTime(20)
	escape(); vi.advanceTimersByTime(50)
	expect(c.getState().open).toBe(false)
	leave(trigger()); enter(trigger()); vi.advanceTimersByTime(20)
	expect(c.getState().open).toBe(true)
})

it('deduplicates repeated pending opens and destroys every pending timer', () => {
	const c = setup()
	c.open(); c.open(); c.destroy(); vi.advanceTimersByTime(500)
	expect(c.getState()).toMatchObject({mounted: false, open: false})
	expect(tip().hidden).toBe(true)
})

it('removes only its own description ID when another owner updates descriptions while mounted', () => {
	const c = setup()
	trigger().setAttribute('aria-describedby', 'help tip validation-error')
	c.destroy()
	expect(trigger().getAttribute('aria-describedby')).toBe('help validation-error')
})

it('allows an explicit programmatic reopen after closing', () => {
	const c = setup()
	c.open(); vi.advanceTimersByTime(20)
	c.close(); vi.advanceTimersByTime(10)
	expect(c.getState().open).toBe(false)
	c.open(); vi.advanceTimersByTime(20)
	expect(c.getState().open).toBe(true)
})

it('preserves a description ID that was already supplied by the caller', () => {
	trigger().setAttribute('aria-describedby', 'help tip')
	const c = setup()
	c.destroy()
	expect(trigger().getAttribute('aria-describedby')).toBe('help tip')
})

it('shows fresh focus help after a previous pointer tooltip has normally closed', () => {
	const c = setup()
	enter(trigger()); vi.advanceTimersByTime(20)
	leave(trigger()); vi.advanceTimersByTime(10)
	expect(c.getState().open).toBe(false)
	trigger().focus(); vi.advanceTimersByTime(20)
	expect(c.getState().open).toBe(true)
})
