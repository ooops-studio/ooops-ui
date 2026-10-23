import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createToastStackController} from '../src/toast-stack'

describe('ToastStack queue and lifetime', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => {vi.useRealTimers(); vi.restoreAllMocks()})
	it('keeps generic content, immutable ordered records and monotonic identities', () => {
		const owner = createToastStackController<{text: string}>()
		const first = owner.push({text: 'Same'}), snapshot = owner.getState()
		const second = owner.push({text: 'Same'})
		expect(snapshot.items).toHaveLength(1)
		expect(owner.getState().items.map((item) => item.id)).toEqual([first, second])
		expect(Object.isFrozen(snapshot.items)).toBe(true)
		expect(Object.isFrozen(snapshot.items[0])).toBe(true)
		expect(owner.clear()).toBe(2)
		expect(owner.push({text: 'New'})).toBeGreaterThan(second!)
		owner.destroy()
	})
	it('defaults to persistent messages without timers or severity assumptions', () => {
		const owner = createToastStackController<string>(), dismissed = vi.fn()
		owner.subscribe(dismissed); owner.push('Error or success is host policy')
		vi.advanceTimersByTime(1_000_000)
		expect(owner.getState().items).toHaveLength(1); expect(vi.getTimerCount()).toBe(0)
		owner.destroy(); expect(owner.getState().items).toEqual([])
	})
	it('honors defaults, explicit persistence and independent finite deadlines', () => {
		const onDismiss = vi.fn()
		const owner = createToastStackController<string>({defaultDurationMs: 3200, onDismiss})
		const first = owner.push('Default'), second = owner.push('Short', {durationMs: 1500})
		const persistent = owner.push('Persistent', {durationMs: null})
		vi.advanceTimersByTime(1499); expect(owner.getState().items).toHaveLength(3)
		vi.advanceTimersByTime(1); expect(onDismiss).toHaveBeenLastCalledWith({id: second, value: 'Short'}, 'timeout')
		vi.advanceTimersByTime(1700); expect(onDismiss).toHaveBeenLastCalledWith({id: first, value: 'Default'}, 'timeout')
		expect(owner.getState().items.map((item) => item.id)).toEqual([persistent]); owner.destroy()
	})
	it('clamps finite durations to the host minimum including explicit zero', () => {
		const owner = createToastStackController({minimumDurationMs: 1200})
		owner.push('Zero', {durationMs: 0}); owner.push('Short', {durationMs: 10})
		vi.advanceTimersByTime(1199); expect(owner.getState().items).toHaveLength(2)
		vi.advanceTimersByTime(1); expect(owner.getState().items).toHaveLength(0); owner.destroy()
	})
	it('allows zero duration without a minimum and explicit null default', () => {
		const owner = createToastStackController({defaultDurationMs: null, minimumDurationMs: 0})
		owner.push('Next task', {durationMs: 0}); expect(owner.getState().items).toHaveLength(1)
		vi.advanceTimersByTime(0); expect(owner.getState().items).toEqual([]); owner.destroy()
	})
	it('defers every due row while interacting and expires only on the next interval after exit', () => {
		let focused = true
		const owner = createToastStackController({defaultDurationMs: 1000, deferIntervalMs: 200,
			shouldDeferExpiry: () => focused})
		owner.push('First'); owner.push('Second', {durationMs: 1100})
		vi.advanceTimersByTime(3000); expect(owner.getState().items).toHaveLength(2)
		focused = false; vi.advanceTimersByTime(99); expect(owner.getState().items).toHaveLength(2)
		vi.advanceTimersByTime(1); expect(owner.getState().items).toHaveLength(1)
		vi.advanceTimersByTime(100); expect(owner.getState().items).toHaveLength(0); owner.destroy()
	})
	it('does not reset later deadlines when an earlier toast is manually dismissed', () => {
		const onDismiss = vi.fn()
		const owner = createToastStackController({defaultDurationMs: 3200, onDismiss})
		const first = owner.push('First')!; vi.advanceTimersByTime(500); owner.push('Second')
		expect(owner.dismiss(first)).toBe(true); expect(owner.dismiss(first)).toBe(false)
		expect(onDismiss).toHaveBeenCalledTimes(1); expect(onDismiss).toHaveBeenLastCalledWith({id: first, value: 'First'}, 'manual')
		vi.advanceTimersByTime(3199); expect(owner.getState().items).toHaveLength(1)
		vi.advanceTimersByTime(1); expect(owner.getState().items).toEqual([]); owner.destroy()
	})
	it('clears finite and persistent items, cancels timers and can be reused', () => {
		const onDismiss = vi.fn(), owner = createToastStackController({onDismiss})
		owner.push('Timed', {durationMs: 50}); owner.push('Persistent')
		expect(owner.clear()).toBe(2); expect(owner.clear()).toBe(0); expect(vi.getTimerCount()).toBe(0)
		expect(onDismiss.mock.calls.map((call) => call[1])).toEqual(['clear', 'clear'])
		owner.push('New'); vi.advanceTimersByTime(1000); expect(owner.getState().items).toHaveLength(1); owner.destroy()
	})
	it('tears down timers and subscribers idempotently without dismissal callbacks', () => {
		const onDismiss = vi.fn(), subscriber = vi.fn(), owner = createToastStackController({onDismiss})
		owner.subscribe(subscriber); owner.push('Pending', {durationMs: 100}); owner.destroy(); owner.destroy()
		const calls = subscriber.mock.calls.length
		expect(owner.push('Late')).toBeNull(); expect(owner.dismiss(1)).toBe(false); expect(owner.clear()).toBe(0)
		vi.runAllTimers(); expect(vi.getTimerCount()).toBe(0); expect(onDismiss).not.toHaveBeenCalled()
		expect(subscriber).toHaveBeenCalledTimes(calls); expect(owner.getState().items).toEqual([])
	})
	it('supports unsubscribing and safe synchronous dismissal from a subscription', () => {
		const owner = createToastStackController({defaultDurationMs: 100})
		const stop = owner.subscribe(({items}) => {if (items.length) owner.dismiss(items[0].id)})
		owner.push('Immediately removed'); expect(owner.getState().items).toEqual([]); expect(vi.getTimerCount()).toBe(0)
		stop(); owner.push('Retained'); expect(owner.getState().items).toHaveLength(1); owner.destroy()
	})
	it('does not revive timers when the defer predicate removes or destroys the queue', () => {
		const removed = createToastStackController({
			shouldDeferExpiry: () => {removed.clear(); return true}})
		removed.push('Removed', {durationMs: 10}); vi.advanceTimersByTime(10)
		expect(vi.getTimerCount()).toBe(0); expect(removed.getState().items).toEqual([])
		removed.destroy()
		const destroyed = createToastStackController({
			shouldDeferExpiry: () => {destroyed.destroy(); return true}})
		destroyed.push('Destroyed', {durationMs: 10}); vi.advanceTimersByTime(10)
		expect(vi.getTimerCount()).toBe(0); expect(destroyed.getState().items).toEqual([])
	})
	it('clear only removes its snapshot and preserves a newly pushed message from callbacks', () => {
		let generated = false
		const owner = createToastStackController<string>({onDismiss: () => {if (!generated) {generated = true; owner.push('New')}}})
		owner.push('First'); owner.push('Second'); expect(owner.clear()).toBe(2)
		expect(owner.getState().items.map((item) => item.value)).toEqual(['New']); owner.destroy()
	})
	it.each([NaN, Infinity, -Infinity, -1, 2_147_483_648])('rejects invalid duration %s before adding state or timers', (value) => {
		expect(() => createToastStackController({defaultDurationMs: value})).toThrow(RangeError)
		expect(() => createToastStackController({minimumDurationMs: value})).toThrow(RangeError)
		expect(() => createToastStackController({deferIntervalMs: value})).toThrow(RangeError)
		const owner = createToastStackController(); expect(() => owner.push('Invalid', {durationMs: value})).toThrow(RangeError)
		expect(owner.getState().items).toEqual([]); expect(vi.getTimerCount()).toBe(0); owner.destroy()
	})
	it('ignores a queued timeout callback after dismissal or destruction', () => {
		const timer = vi.spyOn(globalThis, 'setTimeout'), onDismiss = vi.fn()
		const owner = createToastStackController({onDismiss})
		const first = owner.push('Dismissed', {durationMs: 20})!
		const expired = timer.mock.calls.at(-1)![0] as () => void
		owner.dismiss(first); expired()
		owner.push('Disposed', {durationMs: 20})
		const stale = timer.mock.calls.at(-1)![0] as () => void
		owner.destroy(); stale(); expect(onDismiss).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
	})
	it('stops clearing safely when a dismissal callback destroys the owner', () => {
		const owner = createToastStackController({onDismiss: () => owner.destroy()})
		owner.push('First'); owner.push('Second')
		expect(owner.clear()).toBe(1); expect(owner.getState().items).toEqual([])
	})
	it('rejects a zero defer interval to avoid a busy loop', () => {
		expect(() => createToastStackController({deferIntervalMs: 0})).toThrow(RangeError)
	})
})
