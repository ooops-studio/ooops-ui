import type {SceneFrame, SceneViewport} from './types'

type FrameEntry = {
	viewport: () => SceneViewport
	run: (frame: SceneFrame) => void
}

type FrameScheduler = {
	add: (entry: FrameEntry) => () => void
}

const schedulers = new WeakMap<Window, FrameScheduler>()

export const getFrameScheduler = (window: Window): FrameScheduler => {
	const existing = schedulers.get(window)
	if (existing) return existing
	const entries = new Set<FrameEntry>()
	let frameId: number | null = null
	let previous = 0
	const tick = (time: number) => {
		frameId = null
		const delta = previous === 0 ? 0 : Math.min(100, Math.max(0, time - previous))
		previous = time
		for (const entry of entries) {
			entry.run(Object.freeze({
				time,
				delta,
				viewport: entry.viewport(),
				scrollX: window.scrollX,
				scrollY: window.scrollY
			}))
		}
		if (entries.size > 0) frameId = window.requestAnimationFrame(tick)
	}
	const scheduler: FrameScheduler = {
		add(entry) {
			entries.add(entry)
			if (frameId === null) frameId = window.requestAnimationFrame(tick)
			return () => {
				entries.delete(entry)
				if (entries.size === 0 && frameId !== null) {
					window.cancelAnimationFrame(frameId)
					frameId = null
					previous = 0
				}
			}
		}
	}
	schedulers.set(window, scheduler)
	return scheduler
}
