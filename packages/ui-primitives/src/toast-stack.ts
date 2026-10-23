import {createControllerStore} from './store'

export type ToastStackItem<Value> = Readonly<{id: number; value: Value}>
export type ToastStackState<Value> = {items: readonly ToastStackItem<Value>[]}
export type ToastDismissReason = 'manual' | 'timeout' | 'clear'
export type ToastStackOptions<Value> = {
	/** null keeps messages until explicit dismissal. No product severity policy is imposed. */
	defaultDurationMs?: number | null
	minimumDurationMs?: number
	/** Recheck interval after a deadline is deferred; not a reset of its duration. */
	deferIntervalMs?: number
	shouldDeferExpiry?: () => boolean
	onDismiss?: (item: ToastStackItem<Value>, reason: ToastDismissReason) => void
}

/** Queue/lifetime owner. Hosts retain content, events, live regions, portals and focus recovery. */
export function createToastStackController<Value>(options: ToastStackOptions<Value> = {}) {
	const duration = (value: number | null) => {
		if (value !== null && (!Number.isFinite(value) || value < 0 || value > 2_147_483_647))
			throw new RangeError('Toast duration must be between 0 and 2147483647 milliseconds, or null.')
		return value
	}
	const defaultDuration = duration(options.defaultDurationMs ?? null)
	const minimum = duration(options.minimumDurationMs ?? 0)!
	const interval = duration(options.deferIntervalMs ?? 200)!
	if (interval === 0) throw new RangeError('Toast defer interval must be positive.')
	let seed = 0, disposed = false
	const store = createControllerStore<ToastStackState<Value>>({items: Object.freeze([])})
	const timers = new Map<number, ReturnType<typeof setTimeout>>()
	const clearTimer = (id: number) => {
		const timer = timers.get(id)
		if (timer !== undefined) {clearTimeout(timer); timers.delete(id)}
	}
	const dismiss = (id: number, reason: ToastDismissReason) => {
		if (disposed) return false
		const item = store.getState().items.find((entry) => entry.id === id)
		if (!item) return false
		clearTimer(id)
		const items = store.getState().items.filter((entry) => entry.id !== id)
		store.setState({items: Object.freeze(items)})
		options.onDismiss?.(item, reason)
		return true
	}
	const schedule = (id: number, delay: number) => {
		timers.set(id, setTimeout(() => {
			timers.delete(id)
			if (disposed || !store.getState().items.some((item) => item.id === id)) return
			const deferred = options.shouldDeferExpiry?.() ?? false
			// A host callback can dispose or remove the item. Never revive its timer.
			if (disposed || !store.getState().items.some((item) => item.id === id)) return
			if (deferred) schedule(id, interval)
			else dismiss(id, 'timeout')
		}, delay))
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		push(value: Value, {durationMs = defaultDuration}: {durationMs?: number | null} = {}) {
			if (disposed) return null
			const lifetime = duration(durationMs)
			const item = Object.freeze({id: ++seed, value})
			// Arm before emitting so a subscriber can immediately dismiss or destroy safely.
			if (lifetime !== null) schedule(item.id, Math.max(minimum, lifetime))
			store.setState({items: Object.freeze([...store.getState().items, item])})
			return item.id
		},
		dismiss: (id: number) => dismiss(id, 'manual'),
		clear() {
			let removed = 0
			for (const item of store.getState().items) if (dismiss(item.id, 'clear')) removed++
			return removed
		},
		destroy() {
			disposed = true
			for (const id of timers.keys()) clearTimer(id)
			store.clear()
			store.setState({items: Object.freeze([])})
		}
	}
}
export type ToastStackController<Value> = ReturnType<typeof createToastStackController<Value>>
