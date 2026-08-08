import type {SceneCoordinator} from './types'

type Entry = {
	id: string
	visible: boolean
	order: number
	admitted: boolean
	onAdmissionChange: (admitted: boolean) => void
}

export const createSceneCoordinator = (options: {maxActive?: number} = {}): SceneCoordinator => {
	const maxActive = options.maxActive ?? 2
	if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 16) {
		throw new RangeError('maxActive must be an integer between 1 and 16.')
	}
	const entries = new Map<string, Entry>()
	let order = 0
	let disposed = false
	const reconcile = () => {
		if (disposed) return
		const active = new Set(
			[...entries.values()]
				.filter((entry) => entry.visible)
				.sort((left, right) => right.order - left.order)
				.slice(0, maxActive)
				.map((entry) => entry.id)
		)
		for (const entry of entries.values()) {
			const admitted = active.has(entry.id)
			if (admitted === entry.admitted) continue
			entry.admitted = admitted
			entry.onAdmissionChange(admitted)
		}
	}
	return {
		register(id, onAdmissionChange) {
			if (disposed) throw new Error('Scene coordinator is disposed.')
			if (entries.has(id)) throw new Error(`Scene coordinator already contains ${id}.`)
			const entry: Entry = {id, visible: true, order: ++order, admitted: false, onAdmissionChange}
			entries.set(id, entry)
			reconcile()
			let removed = false
			return {
				setVisible(visible) {
					if (removed || entry.visible === visible) return
					entry.visible = visible
					if (visible) entry.order = ++order
					reconcile()
				},
				touch() {
					if (removed) return
					entry.order = ++order
					reconcile()
				},
				dispose() {
					if (removed) return
					removed = true
					entries.delete(id)
					reconcile()
				}
			}
		},
		getActiveIds: () => Object.freeze(
			[...entries.values()].filter((entry) => entry.admitted).map((entry) => entry.id)
		),
		dispose() {
			if (disposed) return
			disposed = true
			entries.clear()
		}
	}
}
