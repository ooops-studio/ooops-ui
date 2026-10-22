import type * as Y from 'yjs'

/** Release view listeners without destroying the session's undo history. */
export function leaseRichTextUndo(manager: Y.UndoManager): Y.UndoManager {
	const listeners: Array<{event: string; listener: (...args: unknown[]) => void}> = []
	return new Proxy(manager, {
		get(target, key) {
			if (key === 'destroy') return () => {
				for (const item of listeners.splice(0)) {
					target.off(item.event as never, item.listener as never)
				}
			}
			if (key === 'on') return (event: string, listener: (...args: unknown[]) => void) => {
				listeners.push({event, listener})
				target.on(event as never, listener as never)
			}
			if (key === 'off') return (event: string, listener: (...args: unknown[]) => void) => {
				const index = listeners.findIndex((item) =>
					item.event === event && item.listener === listener)
				if (index >= 0) listeners.splice(index, 1)
				target.off(event as never, listener as never)
			}
			const value = Reflect.get(target, key, target)
			return typeof value === 'function' ? value.bind(target) : value
		}
	})
}
