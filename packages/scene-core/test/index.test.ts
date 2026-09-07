import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
	createSceneCoordinator,
	createSceneHost,
	defineInteractiveScene,
	type InteractiveScene,
	type SceneRuntimeState
} from '../src/index'

const manifest = {
	id: 'test-scene',
	backend: 'canvas2d',
	quality: {default: 'auto', allowed: ['low', 'auto', 'high']},
	fallbacks: {
		reducedMotion: 'poster',
		contextLoss: 'poster'
	}
} as const

class TestResizeObserver {
	static observers: TestResizeObserver[] = []
	constructor(private readonly callback: ResizeObserverCallback) {
		TestResizeObserver.observers.push(this)
	}
	observe() {}
	disconnect() {}
	trigger(target: Element) {
		this.callback([{target} as ResizeObserverEntry], this as unknown as ResizeObserver)
	}
}

class TestIntersectionObserver {
	static observers: TestIntersectionObserver[] = []
	constructor(private readonly callback: IntersectionObserverCallback) {
		TestIntersectionObserver.observers.push(this)
	}
	observe() {}
	disconnect() {}
	trigger(target: Element, isIntersecting: boolean) {
		this.callback(
			[{target, isIntersecting} as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		)
	}
}

const makeElements = () => {
	const element = document.createElement('div')
	const canvas = document.createElement('canvas')
	element.appendChild(canvas)
	document.body.appendChild(element)
	vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
		width: 320,
		height: 180,
		top: 0,
		left: 0,
		right: 320,
		bottom: 180,
		x: 0,
		y: 0,
		toJSON: () => ({})
	})
	vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(element.getBoundingClientRect())
	return {element, canvas}
}

beforeEach(() => {
	TestResizeObserver.observers = []
	TestIntersectionObserver.observers = []
	vi.stubGlobal('ResizeObserver', TestResizeObserver)
	vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
		setTimeout(() => callback(performance.now()), 1) as unknown as number)
	vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
	Object.defineProperty(window, 'devicePixelRatio', {configurable: true, value: 3})
	Object.defineProperty(document, 'hidden', {configurable: true, value: false})
	window.matchMedia = vi.fn().mockReturnValue({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	})
})

afterEach(() => {
	document.body.replaceChildren()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

describe('@ooopsstudio/scene-core', () => {
	it('validates and freezes scene definitions while creating isolated instances', () => {
		const create = vi.fn(() => ({mount: vi.fn()}))
		const definition = defineInteractiveScene({manifest, create})
		expect(Object.isFrozen(definition)).toBe(true)
		expect(Object.isFrozen(definition.manifest)).toBe(true)
		expect(definition.create()).not.toBe(definition.create())
		expect(() => defineInteractiveScene({...definition, manifest: {...manifest, backend: 'unsafe'} as never}))
			.toThrow(/Unsupported interactive scene backend/)
	})

	it('mounts, resizes with DPR caps, schedules frames and disposes once', async() => {
		const {element, canvas} = makeElements()
		const frames = vi.fn()
		const resize = vi.fn()
		const dispose = vi.fn()
		const definition = defineInteractiveScene({
			manifest,
			create: (): InteractiveScene<{speed: number}> => ({
				mount(context) { context.setBackend('canvas2d') },
				resize,
				frame: frames,
				dispose
			})
		})
		const states: SceneRuntimeState[] = []
		const host = createSceneHost({
			element,
			canvas,
			definition,
			config: {speed: 1},
			quality: 'high',
			onStateChange: (state) => states.push(state)
		})
		await host.mount()
		await new Promise((resolve) => setTimeout(resolve, 5))
		expect(host.getState()).toMatchObject({status: 'running', backend: 'canvas2d'})
		expect(canvas.width).toBe(640)
		expect(resize).toHaveBeenCalledWith({width: 320, height: 180, dpr: 2})
		expect(frames).toHaveBeenCalled()
		await host.dispose()
		await host.dispose()
		expect(dispose).toHaveBeenCalledTimes(1)
		expect(states.at(-1)?.status).toBe('disposed')
	})

	it('keeps each quality tier within its pixel budget on large viewports', async() => {
		const {element, canvas} = makeElements()
		vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
			width: 3840,
			height: 2160,
			top: 0,
			left: 0,
			right: 3840,
			bottom: 2160,
			x: 0,
			y: 0,
			toJSON: () => ({})
		})
		vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(element.getBoundingClientRect())
		const resize = vi.fn()
		const definition = defineInteractiveScene({
			manifest,
			create: () => ({mount() {}, resize})
		})
		const budgets = {low: 1_000_000, auto: 2_250_000, high: 4_000_000} as const
		const host = createSceneHost({element, canvas, definition, config: {}, quality: 'auto'})
		await host.mount()
		for (const quality of ['low', 'auto', 'high'] as const) {
			host.setQuality(quality)
			expect(canvas.width * canvas.height).toBeLessThanOrEqual(budgets[quality] + 10_000)
		}
		await host.dispose()
	})

	it('forwards pointer input only in interact mode', async() => {
		const {element, canvas} = makeElements()
		const pointer = vi.fn()
		const stateChange = vi.fn()
		const definition = defineInteractiveScene({
			manifest,
			create: () => ({mount() {}, pointer})
		})
		const host = createSceneHost({
			element,
			canvas,
			definition,
			config: {},
			onStateChange: stateChange
		})
		await host.mount()
		canvas.dispatchEvent(new PointerEvent('pointermove', {clientX: 40, clientY: 20}))
		expect(pointer).not.toHaveBeenCalled()
		host.setInteractionMode('interact')
		const stateChangeCount = stateChange.mock.calls.length
		host.setInteractionMode('interact')
		expect(stateChange).toHaveBeenCalledTimes(stateChangeCount)
		canvas.dispatchEvent(new PointerEvent('pointermove', {clientX: 40, clientY: 20}))
		expect(pointer).toHaveBeenCalledTimes(1)
		expect(pointer.mock.calls[0]?.[0]).toMatchObject({normalizedX: -0.75})
		await host.dispose()
	})

	it('collapses queued configuration updates and freezes admitted values', async() => {
		const {element, canvas} = makeElements()
		const received: unknown[] = []
		let release: (() => void) | undefined
		const first = new Promise<void>((resolve) => { release = resolve })
		const definition = defineInteractiveScene({
			manifest,
			create: () => ({
				mount() {},
				async update(config) {
					received.push(config)
					if (received.length === 1) await first
				}
			})
		})
		const host = createSceneHost({element, canvas, definition, config: {step: 0}})
		await host.mount()
		const firstUpdate = host.update({step: 1})
		const latestUpdate = host.update({step: 2})
		release?.()
		await Promise.all([firstUpdate, latestUpdate])
		expect(received).toHaveLength(2)
		expect(received.at(-1)).toEqual({step: 2})
		expect(Object.isFrozen(received.at(-1))).toBe(true)
		await host.dispose()
	})

	it('rejects hostile and non-JSON configuration without invoking accessors', async() => {
		const {element, canvas} = makeElements()
		const getter = vi.fn(() => 'secret')
		const config = Object.defineProperty({}, 'value', {enumerable: true, get: getter})
		const definition = defineInteractiveScene({manifest, create: () => ({mount() {}})})
		expect(() => createSceneHost({element, canvas, definition, config})).toThrow(/accessor/)
		expect(getter).not.toHaveBeenCalled()
	})

	it('admits at most two visible scenes and promotes the latest visible scene', () => {
		const coordinator = createSceneCoordinator()
		const states = new Map<string, boolean>()
		const registrations = ['one', 'two', 'three'].map((id) =>
			coordinator.register(id, (active) => states.set(id, active)))
		expect(coordinator.getActiveIds()).toEqual(['two', 'three'])
		registrations[2]?.setVisible(false)
		expect(coordinator.getActiveIds()).toEqual(['one', 'two'])
		registrations[0]?.touch()
		expect(coordinator.getActiveIds()).toEqual(['one', 'two'])
		expect(states.get('three')).toBe(false)
		coordinator.dispose()
	})

	it('pauses offscreen and falls back deterministically on context loss or abort', async() => {
		const {element, canvas} = makeElements()
		const pause = vi.fn()
		const abort = new AbortController()
		const definition = defineInteractiveScene({manifest, create: () => ({mount() {}, pause})})
		const host = createSceneHost({element, canvas, definition, config: {}, signal: abort.signal})
		await host.mount()
		TestIntersectionObserver.observers[0]?.trigger(element, false)
		expect(host.getState()).toMatchObject({status: 'paused', pauseReasons: ['offscreen']})
		canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}))
		expect(host.getState()).toMatchObject({status: 'fallback', fallbackReason: 'context-lost'})
		abort.abort()
		expect(host.getState().fallbackReason).toBe('context-lost')
		await host.dispose()
	})

	it('uses reduced-motion poster behavior and validates quality choices', async() => {
		window.matchMedia = vi.fn().mockReturnValue({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		})
		const {element, canvas} = makeElements()
		const definition = defineInteractiveScene({manifest, create: () => ({mount() {}})})
		const host = createSceneHost({element, canvas, definition, config: {}})
		await host.mount()
		expect(host.getState()).toMatchObject({status: 'paused', pauseReasons: ['reduced-motion']})
		expect(() => host.setQuality('cinematic' as never)).toThrow(/not allowed/)
		await host.dispose()
	})
})
