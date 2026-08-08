import {BoxGeometry, Mesh, MeshBasicMaterial, Texture} from 'three'
import {afterEach, describe, expect, it, vi} from 'vitest'

const {rendererInstances, FakeRenderer} = vi.hoisted(() => {
	class Renderer {
		backend: {isWebGPUBackend: boolean; device?: {lost: Promise<unknown>}}
		loseDevice: () => void = () => undefined
		init = vi.fn(async() => {})
		render = vi.fn()
		setPixelRatio = vi.fn()
		setSize = vi.fn()
		dispose = vi.fn()
		constructor(readonly options: {forceWebGL?: boolean}) {
			const lost = new Promise<unknown>((resolve) => {
				this.loseDevice = () => resolve(undefined)
			})
			this.backend = {isWebGPUBackend: !options.forceWebGL, device: {lost}}
			renderers.push(this)
		}
	}
	const renderers: Renderer[] = []
	return {rendererInstances: renderers, FakeRenderer: Renderer}
})

vi.mock('three/webgpu', async(importOriginal) => ({
	...(await importOriginal<typeof import('three/webgpu')>()),
	WebGPURenderer: FakeRenderer
}))

import {
	createResponsivePerspectiveCamera,
	createThreeAssetLoader,
	createThreeResourceTracker,
	defineThreeScene,
	resizePerspectiveCamera
} from '../src/index'

const manifest = (backend: 'auto' | 'webgpu' | 'webgl2' | 'canvas2d' = 'auto') => ({
	schemaVersion: 2,
	id: 'three-test',
	label: 'Three test',
	category: 'test',
	owner: '@ooopsstudio/scene-three',
	insertable: true,
	internals: 'locked',
	adapters: {
		astro: '@ooopsstudio/scene-astro/InteractiveScene.astro',
		runtime: '@ooopsstudio/scene-three'
	},
	backend,
	controls: [],
	assets: [],
	inputs: ['pointer', 'time', 'viewport'],
	quality: {default: 'auto', allowed: ['low', 'auto', 'high']},
	fallbacks: {
		poster: 'public/poster.webp',
		description: 'A test scene.',
		reducedMotion: 'poster',
		contextLoss: 'poster'
	}
} as const)

afterEach(() => {
	rendererInstances.length = 0
	vi.restoreAllMocks()
})

describe('@ooopsstudio/scene-three', () => {
	it('disposes tracked geometry, materials, textures and objects idempotently', () => {
		const tracker = createThreeResourceTracker()
		const texture = new Texture()
		const geometry = new BoxGeometry()
		const material = new MeshBasicMaterial({map: texture})
		const mesh = new Mesh(geometry, material)
		const geometryDispose = vi.spyOn(geometry, 'dispose')
		const materialDispose = vi.spyOn(material, 'dispose')
		const textureDispose = vi.spyOn(texture, 'dispose')
		tracker.track(mesh)
		tracker.dispose()
		tracker.dispose()
		expect(geometryDispose).toHaveBeenCalledTimes(1)
		expect(materialDispose).toHaveBeenCalledTimes(1)
		expect(textureDispose).toHaveBeenCalledTimes(1)
	})

	it('creates and resizes responsive perspective cameras', () => {
		const camera = createResponsivePerspectiveCamera({position: [1, 2, 3]})
		resizePerspectiveCamera(camera, {width: 400, height: 200, dpr: 2})
		expect(camera.position.toArray()).toEqual([1, 2, 3])
		expect(camera.aspect).toBe(2)
	})

	it('forces WebGL 2 only when requested and reports the selected backend', async() => {
		for (const [backend, expected] of [['auto', 'webgpu'], ['webgl2', 'webgl2']] as const) {
			const setup = vi.fn(() => undefined)
			const definition = defineThreeScene({manifest: manifest(backend), setup})
			const instance = definition.create()
			const selected: string[] = []
			await instance.mount({
				host: document.createElement('div'),
				canvas: document.createElement('canvas'),
				signal: new AbortController().signal,
				getQuality: () => 'auto',
				getInteractionMode: () => 'interact',
				getViewport: () => ({width: 100, height: 100, dpr: 1}),
				setBackend: (value) => selected.push(value),
				fail: vi.fn()
			}, {})
			expect(rendererInstances.at(-1)?.options.forceWebGL).toBe(backend === 'webgl2')
			expect(selected).toEqual([expected])
			expect(setup).toHaveBeenCalledTimes(1)
			await instance.dispose?.()
			expect(rendererInstances.at(-1)?.dispose).toHaveBeenCalledOnce()
		}
	})

	it('renders each admitted frame through the initialized renderer', async() => {
		const definition = defineThreeScene({manifest: manifest(), setup: () => undefined})
		const instance = definition.create()
		await instance.mount({
			host: document.createElement('div'),
			canvas: document.createElement('canvas'),
			signal: new AbortController().signal,
			getQuality: () => 'auto',
			getInteractionMode: () => 'interact',
			getViewport: () => ({width: 100, height: 100, dpr: 1}),
			setBackend: vi.fn(),
			fail: vi.fn()
		}, {})
		const renderer = rendererInstances.at(-1)
		if (!renderer) throw new Error('Missing renderer.')
		const frame = {
			time: 1,
			delta: 16,
			viewport: {width: 100, height: 100, dpr: 1},
			scrollX: 0,
			scrollY: 0
		}
		instance.frame?.(frame)
		instance.frame?.(frame)
		expect(renderer.render).toHaveBeenCalledTimes(2)
		await instance.dispose?.()
	})

	it('routes render failures through the scene fallback boundary', async() => {
		const definition = defineThreeScene({manifest: manifest(), setup: () => undefined})
		const instance = definition.create()
		const fail = vi.fn()
		await instance.mount({
			host: document.createElement('div'),
			canvas: document.createElement('canvas'),
			signal: new AbortController().signal,
			getQuality: () => 'auto',
			getInteractionMode: () => 'interact',
			getViewport: () => ({width: 100, height: 100, dpr: 1}),
			setBackend: vi.fn(),
			fail
		}, {})
		const renderer = rendererInstances.at(-1)
		if (!renderer) throw new Error('Missing renderer.')
		renderer.render.mockImplementationOnce(() => {
			throw new Error('sensitive renderer failure')
		})
		instance.frame?.({
			time: 1,
			delta: 16,
			viewport: {width: 100, height: 100, dpr: 1},
			scrollX: 0,
			scrollY: 0
		})
		expect(fail).toHaveBeenCalledWith('render-failed')
		await instance.dispose?.()
	})

	it('rejects canvas2d and remote decoder configuration', () => {
		expect(() => defineThreeScene({manifest: manifest('canvas2d'), setup: () => undefined}))
			.toThrow(/canvas2d/)
		expect(() => defineThreeScene({
			manifest: manifest(),
			decoders: {dracoDecoderPath: 'https://cdn.example.com/draco/'},
			setup: () => undefined
		})).toThrow(/local project path/)
	})

	it('rejects remote assets and requires explicit KTX2 decoder paths', async() => {
		const loader = createThreeAssetLoader()
		await expect(loader.loadTexture('https://example.com/image.webp')).rejects.toThrow(/local/)
		await expect(loader.loadKtx2('/assets/image.ktx2')).rejects.toThrow(/ktx2TranscoderPath/)
		loader.dispose()
	})

	it('reports WebGPU device loss through the core failure boundary', async() => {
		const definition = defineThreeScene({manifest: manifest(), setup: () => undefined})
		const instance = definition.create()
		const fail = vi.fn()
		await instance.mount({
			host: document.createElement('div'),
			canvas: document.createElement('canvas'),
			signal: new AbortController().signal,
			getQuality: () => 'auto',
			getInteractionMode: () => 'interact',
			getViewport: () => ({width: 100, height: 100, dpr: 1}),
			setBackend: vi.fn(),
			fail
		}, {})
		const renderer = rendererInstances.at(-1)
		if (!renderer) throw new Error('Missing renderer.')
		renderer.loseDevice()
		await Promise.resolve()
		expect(fail).toHaveBeenCalledWith('webgpu-device-lost')
		await instance.dispose?.()
	})
})
