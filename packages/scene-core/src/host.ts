import {createAdaptivePixelBudget} from './adaptive-resolution'
import {snapshotSceneConfig} from './json'
import {getFrameScheduler} from './scheduler'
import type {
	InteractiveScene,
	SceneHost,
	SceneHostOptions,
	ScenePauseReason,
	ScenePointerInput,
	SceneQuality,
	SceneRuntimeState,
	SceneViewport
} from './types'

const dprCaps: Record<SceneQuality, number> = {low: 1, auto: 1.5, high: 2}
const pixelBudgets: Record<SceneQuality, number> = {
	low: 1_000_000,
	auto: 2_250_000,
	high: 4_000_000
}
const minimumDpr = 0.25
let nextHostId = 0

export const createSceneHost = <Config>(options: SceneHostOptions<Config>): SceneHost<Config> => {
	const {element, canvas, definition} = options
	const window = element.ownerDocument.defaultView
	if (!window) throw new Error('Scene host requires an attached document window.')
	if (canvas.ownerDocument !== element.ownerDocument) {
		throw new Error('Scene host and canvas must belong to the same document.')
	}
	let config = snapshotSceneConfig(options.config)
	let quality = options.quality ?? definition.manifest.quality.default
	if (!definition.manifest.quality.allowed.includes(quality)) {
		throw new RangeError(`Scene quality ${quality} is not allowed.`)
	}
	let interactionMode = options.interactionMode ?? 'select'
	const adaptivePixelBudget = createAdaptivePixelBudget()
	canvas.style.pointerEvents = interactionMode === 'interact' ? 'auto' : 'none'
	let status: SceneRuntimeState['status'] = 'idle'
	let backend: SceneRuntimeState['backend'] = 'unknown'
	let fallbackReason: string | undefined
	let viewport: SceneViewport = Object.freeze({width: 0, height: 0, dpr: 1})
	let instance: InteractiveScene<Config> | null = null
	let mounted = false
	let disposed = false
	let updateVersion = 0
	let pendingUpdate: Readonly<Config> | null = null
	let updateTask: Promise<void> | null = null
	let stopFrame: (() => void) | null = null
	const pauseReasons = new Set<ScenePauseReason>()
	const abort = new AbortController()
	const cleanups: Array<() => void> = []
	const sceneId = `${definition.manifest.id}-${++nextHostId}`

	const state = (): SceneRuntimeState => Object.freeze({
		status,
		backend,
		quality,
		interactionMode,
		pauseReasons: Object.freeze([...pauseReasons].sort()),
		...(fallbackReason ? {fallbackReason} : {})
	})
	const emit = () => options.onStateChange?.(state())
	const setStatus = (next: SceneRuntimeState['status']) => {
		if (status === next) return
		status = next
		emit()
	}
	const fail = (reason: string) => {
		if (disposed || status === 'fallback') return
		fallbackReason = String(reason || 'runtime-failure').slice(0, 160)
		stopFrame?.()
		stopFrame = null
		setStatus('fallback')
	}
	const measure = () => {
		const bounds = element.getBoundingClientRect()
		const cap = dprCaps[quality]
		const width = Math.max(0, Math.round(bounds.width))
		const height = Math.max(0, Math.round(bounds.height))
		const cssPixels = Math.max(1, width * height)
		const pixelBudget = quality === 'auto' ? adaptivePixelBudget.value : pixelBudgets[quality]
		const budgetDpr = Math.sqrt(pixelBudget / cssPixels)
		const next: SceneViewport = Object.freeze({
			width,
			height,
			dpr: Math.max(minimumDpr, Math.min(cap, window.devicePixelRatio || 1, budgetDpr))
		})
		if (
			next.width === viewport.width
			&& next.height === viewport.height
			&& next.dpr === viewport.dpr
		) return
		viewport = next
		canvas.width = Math.max(1, Math.round(next.width * next.dpr))
		canvas.height = Math.max(1, Math.round(next.height * next.dpr))
		void Promise.resolve(instance?.resize?.(next)).catch(() => fail('resize-failed'))
	}
	const syncActivity = () => {
		if (!mounted || disposed || status === 'fallback') return
		const shouldRun = pauseReasons.size === 0
		if (shouldRun) {
			if (!stopFrame && instance?.frame) {
				stopFrame = getFrameScheduler(window).add({
					viewport: () => viewport,
					run: (frame) => {
						try {
							instance?.frame?.(frame)
							if (quality === 'auto' && adaptivePixelBudget.sample(frame.delta)) measure()
						} catch { fail('frame-failed') }
					}
				})
			}
			if (status === 'paused') void Promise.resolve(instance?.resume?.()).catch(() => fail('resume-failed'))
			setStatus('running')
		} else {
			stopFrame?.()
			stopFrame = null
			if (status === 'running') {
				const reason = [...pauseReasons][0] ?? 'manual'
				void Promise.resolve(instance?.pause?.(reason)).catch(() => fail('pause-failed'))
			}
			setStatus('paused')
		}
	}
	const setPaused = (reason: ScenePauseReason, paused: boolean) => {
		if (paused) pauseReasons.add(reason)
		else pauseReasons.delete(reason)
		syncActivity()
	}
	const coordinatorRegistration = options.coordinator?.register(sceneId, (admitted) => {
		setPaused('coordinator', !admitted)
	})
	if (coordinatorRegistration) cleanups.push(coordinatorRegistration.dispose)

	const resizeObserver = typeof ResizeObserver === 'function'
		? new ResizeObserver(measure)
		: null
	resizeObserver?.observe(element)
	if (resizeObserver) cleanups.push(() => resizeObserver.disconnect())
	else {
		window.addEventListener('resize', measure)
		cleanups.push(() => window.removeEventListener('resize', measure))
	}

	const intersectionObserver = typeof IntersectionObserver === 'function'
		? new IntersectionObserver(([entry]) => {
			const visible = Boolean(entry?.isIntersecting)
			setPaused('offscreen', !visible)
			coordinatorRegistration?.setVisible(visible)
		})
		: null
	intersectionObserver?.observe(element)
	if (intersectionObserver) cleanups.push(() => intersectionObserver.disconnect())

	const onVisibility = () => setPaused('hidden', element.ownerDocument.hidden)
	element.ownerDocument.addEventListener('visibilitychange', onVisibility)
	cleanups.push(() => element.ownerDocument.removeEventListener('visibilitychange', onVisibility))

	const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
	const onMotion = () => {
		const usePoster = definition.manifest.fallbacks.reducedMotion === 'poster'
		setPaused('reduced-motion', Boolean(motion?.matches && usePoster))
	}
	motion?.addEventListener?.('change', onMotion)
	if (motion) cleanups.push(() => motion.removeEventListener?.('change', onMotion))

	const onContextLost = (event: Event) => {
		event.preventDefault()
		fail('context-lost')
	}
	canvas.addEventListener('webglcontextlost', onContextLost)
	cleanups.push(() => canvas.removeEventListener('webglcontextlost', onContextLost))

	let previousPointer = {x: 0, y: 0, time: 0}
	const pointerType = (type: string): ScenePointerInput['type'] => {
		if (type === 'pointerdown') return 'down'
		if (type === 'pointerup') return 'up'
		if (type === 'pointercancel') return 'cancel'
		return 'move'
	}
	const onPointer = (event: PointerEvent) => {
		if (interactionMode !== 'interact' || !instance?.pointer || status !== 'running') return
		const bounds = canvas.getBoundingClientRect()
		const elapsed = previousPointer.time ? Math.max(1, event.timeStamp - previousPointer.time) : 1
		const x = event.clientX - bounds.left
		const y = event.clientY - bounds.top
		const input: ScenePointerInput = Object.freeze({
			type: pointerType(event.type),
			x,
			y,
			normalizedX: bounds.width ? (x / bounds.width) * 2 - 1 : 0,
			normalizedY: bounds.height ? 1 - (y / bounds.height) * 2 : 0,
			velocityX: (x - previousPointer.x) / elapsed,
			velocityY: (y - previousPointer.y) / elapsed,
			buttons: event.buttons,
			pointerType: event.pointerType
		})
		previousPointer = {x, y, time: event.timeStamp}
		try { instance.pointer(input) } catch { fail('pointer-failed') }
	}
	for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
		canvas.addEventListener(type, onPointer as EventListener)
		cleanups.push(() => canvas.removeEventListener(type, onPointer as EventListener))
	}

	const externalAbort = () => fail('aborted')
	if (options.signal) {
		if (options.signal.aborted) externalAbort()
		else {
			options.signal.addEventListener('abort', externalAbort, {once: true})
			cleanups.push(() => options.signal?.removeEventListener('abort', externalAbort))
		}
	}

	const drainUpdates = async() => {
		while (pendingUpdate && !disposed) {
			const next = pendingUpdate
			pendingUpdate = null
			const version = updateVersion
			await instance?.update?.(next)
			if (version !== updateVersion) continue
		}
	}

	return {
		async mount() {
			if (disposed) throw new Error('Scene host is disposed.')
			if (mounted) return
			mounted = true
			setStatus('mounting')
			measure()
			onVisibility()
			onMotion()
			try {
				instance = definition.create()
				await instance.mount(Object.freeze({
					host: element,
					canvas,
					signal: abort.signal,
					...(options.audioElement ? {audioElement: options.audioElement} : {}),
					getQuality: () => quality,
					getInteractionMode: () => interactionMode,
					getViewport: () => viewport,
					setBackend(next) { backend = next; emit() },
					fail
				}), config)
				await instance.resize?.(viewport)
				syncActivity()
			} catch {
				fail('mount-failed')
			}
		},
		async update(nextConfig) {
			if (disposed) throw new Error('Scene host is disposed.')
			config = snapshotSceneConfig(nextConfig)
			pendingUpdate = config
			updateVersion += 1
			updateTask ??= drainUpdates().finally(() => { updateTask = null })
			await updateTask
		},
		setQuality(next) {
			if (!definition.manifest.quality.allowed.includes(next)) {
				throw new RangeError(`Scene quality ${next} is not allowed.`)
			}
			if (quality !== next && next === 'auto') adaptivePixelBudget.reset()
			quality = next
			measure()
			emit()
		},
		setInteractionMode(next) {
			if (interactionMode === next) return
			interactionMode = next
			canvas.style.pointerEvents = next === 'interact' ? 'auto' : 'none'
			coordinatorRegistration?.touch()
			emit()
		},
		pause: () => setPaused('manual', true),
		resume: () => setPaused('manual', false),
		getState: state,
		async dispose() {
			if (disposed) return
			disposed = true
			abort.abort()
			stopFrame?.()
			stopFrame = null
			for (const cleanup of cleanups.splice(0).reverse()) cleanup()
			try { await instance?.dispose?.() } finally {
				instance = null
				status = 'disposed'
				emit()
			}
		}
	}
}
