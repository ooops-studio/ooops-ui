import {defineInteractiveScene} from '@ooopsstudio/scene-core'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {serializeSceneConfig} from '../src/index'
import {
	destroyInteractiveScenes,
	getRegisteredInteractiveSceneIds,
	installInteractiveScenes,
	mountInteractiveScenes,
	registerInteractiveScenes,
	setInteractiveSceneMode
} from '../src/runtime'

let sceneCounter = 0

const manifest = (id: string) => ({
	id,
	backend: 'canvas2d',
	quality: {default: 'auto', allowed: ['low', 'auto', 'high']},
	fallbacks: {
		reducedMotion: 'poster',
		contextLoss: 'poster'
	}
} as const)

const fixture = (scene: string) => {
	const root = document.createElement('figure')
	root.dataset.ooopsSceneRoot = scene
	root.innerHTML = `
		<canvas data-part="canvas"></canvas>
		<button data-ooops-scene-pause aria-pressed="false">Pause animation</button>
		<script type="application/json" data-ooops-scene-config>
			${serializeSceneConfig({scene, config: {speed: 1}, quality: 'auto', mode: 'select'})}
		</script>`
	vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
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
	document.body.appendChild(root)
	return root
}

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', class {
		observe() {}
		disconnect() {}
	})
	vi.stubGlobal('IntersectionObserver', class {
		observe() {}
		disconnect() {}
	})
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
		setTimeout(() => callback(performance.now()), 1) as unknown as number)
	vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
	Object.defineProperty(document, 'hidden', {configurable: true, value: false})
	window.matchMedia = vi.fn().mockReturnValue({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	})
})

afterEach(async() => {
	await destroyInteractiveScenes()
	document.body.replaceChildren()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

describe('@ooopsstudio/scene-astro', () => {
	it('serializes config without executable markup or accessor execution', () => {
		expect(serializeSceneConfig({value: '</script><script>alert(1)</script>'}))
			.not.toContain('<')
		const getter = vi.fn(() => 'secret')
		const hostile = Object.defineProperty({}, 'secret', {enumerable: true, get: getter})
		expect(() => serializeSceneConfig(hostile)).toThrow(/accessor/)
		expect(getter).not.toHaveBeenCalled()
	})

	it('registers explicit definitions and rejects mismatches and conflicts', () => {
		const id = `registry-${++sceneCounter}`
		const definition = defineInteractiveScene({
			manifest: manifest(id),
			create: () => ({mount() {}})
		})
		registerInteractiveScenes({[id]: definition})
		registerInteractiveScenes({[id]: definition})
		expect(getRegisteredInteractiveSceneIds()).toContain(id)
		expect(() => registerInteractiveScenes({wrong: definition})).toThrow(/must match/)
		const conflict = defineInteractiveScene({manifest: manifest(id), create: () => ({mount() {}})})
		expect(() => registerInteractiveScenes({[id]: conflict})).toThrow(/already registered/)
	})

	it('mounts scenes, exposes stable state attributes and toggles manual pause', async() => {
		const id = `mount-${++sceneCounter}`
		const pointer = vi.fn()
		const dispose = vi.fn()
		registerInteractiveScenes({
			[id]: defineInteractiveScene({
				manifest: manifest(id),
				create: () => ({
					mount(context) { context.setBackend('canvas2d') },
					pointer,
					dispose
				})
			})
		})
		const root = fixture(id)
		await mountInteractiveScenes()
		expect(root.dataset).toMatchObject({
			ooopsSceneState: 'running',
			ooopsSceneBackend: 'canvas2d',
			ooopsSceneMode: 'select'
		})
		const pause = root.querySelector<HTMLButtonElement>('button')
		pause?.click()
		expect(root.dataset.ooopsSceneState).toBe('paused')
		expect(pause?.getAttribute('aria-pressed')).toBe('true')
		pause?.click()
		expect(root.dataset.ooopsSceneState).toBe('running')
		setInteractiveSceneMode(root, 'interact')
		expect(root.dataset.ooopsSceneMode).toBe('interact')
		await destroyInteractiveScenes()
		expect(dispose).toHaveBeenCalledOnce()
		expect(root.dataset.ooopsSceneState).toBe('disposed')
	})

	it('handles global Select/Interact events and remounts without duplicate hosts', async() => {
		const id = `lifecycle-${++sceneCounter}`
		const mount = vi.fn()
		const dispose = vi.fn()
		registerInteractiveScenes({
			[id]: defineInteractiveScene({manifest: manifest(id), create: () => ({mount, dispose})})
		})
		const root = fixture(id)
		installInteractiveScenes()
		await mountInteractiveScenes()
		expect(mount).toHaveBeenCalledTimes(1)
		document.dispatchEvent(new CustomEvent('ooops:scene-mode', {detail: {mode: 'interact'}}))
		expect(root.dataset.ooopsSceneMode).toBe('interact')
		await destroyInteractiveScenes()
		await mountInteractiveScenes()
		expect(mount).toHaveBeenCalledTimes(2)
		expect(dispose).toHaveBeenCalledTimes(1)
	})

	it('uses a deterministic fallback for unregistered scene ids', async() => {
		const root = fixture(`missing-${++sceneCounter}`)
		await mountInteractiveScenes(root.ownerDocument)
		expect(root.dataset).toMatchObject({
			ooopsSceneState: 'fallback',
			ooopsSceneFallback: 'unregistered-scene'
		})
	})
})
