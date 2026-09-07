import type {InteractiveSceneContext} from '@ooopsstudio/scene-core'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
	createGpuResourceTracker,
	defineGpuScene,
	type NativeGpuApi,
	type NativeGpuCanvasContext,
	type NativeGpuDevice
} from '../src/index'

const manifest = (backend: 'auto' | 'webgpu' | 'webgl2' | 'canvas2d' = 'auto') => ({
	id: 'gpu-test',
	backend,
	quality: {default: 'auto', allowed: ['low', 'auto', 'high']},
	fallbacks: {reducedMotion: 'poster', contextLoss: 'poster'}
} as const)

const sceneContext = (
	canvas: HTMLCanvasElement,
	fail = vi.fn(),
	quality: 'low' | 'auto' | 'high' = 'auto'
) => {
	const selected: string[] = []
	return {
		selected,
		fail,
		value: {
			host: document.createElement('div'),
			canvas,
			signal: new AbortController().signal,
			getQuality: () => quality,
			getInteractionMode: () => 'interact',
			getViewport: () => ({width: 100, height: 50, dpr: 2}),
			setBackend: (value) => selected.push(value),
			fail
		} satisfies InteractiveSceneContext
	}
}

const installWebGpu = () => {
	let loseDevice = () => undefined
	const lost = new Promise<{message?: string}>((resolve) => { loseDevice = () => resolve({}) })
	const device = {lost} as NativeGpuDevice
	const gpu = {
		requestAdapter: vi.fn(async() => ({requestDevice: vi.fn(async() => device)})),
		getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm')
	} satisfies NativeGpuApi
	Object.defineProperty(navigator, 'gpu', {configurable: true, value: gpu})
	return {device, gpu, loseDevice}
}

afterEach(() => {
	Object.defineProperty(navigator, 'gpu', {configurable: true, value: undefined})
	vi.restoreAllMocks()
})

describe('@ooopsstudio/scene-gpu', () => {
	it('tracks and disposes native resources once in reverse order', () => {
		const calls: string[] = []
		const tracker = createGpuResourceTracker()
		tracker.track(() => calls.push('first'))
		tracker.track({destroy: () => calls.push('second')})
		tracker.track({dispose: () => calls.push('third')})
		tracker.dispose()
		tracker.dispose()
		expect(calls).toEqual(['third', 'second', 'first'])
	})

	it('prepares WebGPU before canvas commitment and delegates lifecycle hooks', async() => {
		const {device} = installWebGpu()
		const order: string[] = []
		const canvasContext = {configure: vi.fn(), getCurrentTexture: vi.fn()} as NativeGpuCanvasContext
		const canvas = document.createElement('canvas')
		vi.spyOn(canvas, 'getContext').mockImplementation(((kind: string) => {
			order.push(`context:${kind}`)
			return kind === 'webgpu' ? canvasContext : null
		}) as typeof canvas.getContext)
		const frame = vi.fn()
		const dispose = vi.fn()
		const definition = defineGpuScene({
			manifest: manifest(),
			webgpu: {prepare: vi.fn(({device: selected}) => {
				expect(selected).toBe(device)
				order.push('prepare')
				return {activate: () => order.push('activate'), frame, dispose}
			})},
			webgl2: {setup: vi.fn(() => ({}))}
		})
		const context = sceneContext(canvas)
		const instance = definition.create()
		await instance.mount(context.value, {})
		expect(order).toEqual(['prepare', 'context:webgpu', 'activate'])
		expect(context.selected).toEqual(['webgpu'])
		instance.frame?.({
			time: 1,
			delta: 16,
			viewport: {width: 100, height: 50, dpr: 2},
			scrollX: 0,
			scrollY: 0
		})
		expect(frame).toHaveBeenCalledOnce()
		await instance.dispose?.()
		expect(dispose).toHaveBeenCalledOnce()
	})

	it('selects power preference from the active quality tier', async() => {
		for (const [quality, expected] of [
			['low', 'low-power'],
			['auto', undefined],
			['high', 'high-performance']
		] as const) {
			const {gpu} = installWebGpu()
			const canvas = document.createElement('canvas')
			const canvasContext = {
				configure: vi.fn(),
				getCurrentTexture: vi.fn()
			} as NativeGpuCanvasContext
			vi.spyOn(canvas, 'getContext').mockImplementation(((kind: string) =>
				kind === 'webgpu' ? canvasContext : null) as typeof canvas.getContext)
			const definition = defineGpuScene({
				manifest: manifest(),
				webgpu: {prepare: () => ({})},
				webgl2: {setup: () => ({})}
			})
			await definition.create().mount(sceneContext(canvas, vi.fn(), quality).value, {})
			expect(gpu.requestAdapter).toHaveBeenCalledWith(
				expected ? {powerPreference: expected} : undefined
			)
		}
	})

	it('falls back to WebGL 2 when WebGPU is absent or preparation fails', async() => {
		for (const prepare of [vi.fn(() => ({})), vi.fn(() => { throw new Error('compile') })]) {
			if (prepare.mock.calls.length === 0 && prepare.getMockImplementation()?.toString().includes('compile')) installWebGpu()
			const canvas = document.createElement('canvas')
			const gl = {canvas, viewport: vi.fn()} as unknown as WebGL2RenderingContext
			vi.spyOn(canvas, 'getContext').mockImplementation(((kind: string) => kind === 'webgl2' ? gl : null) as typeof canvas.getContext)
			const setup = vi.fn(() => ({}))
			const definition = defineGpuScene({manifest: manifest(), webgpu: {prepare}, webgl2: {setup}})
			const context = sceneContext(canvas)
			await definition.create().mount(context.value, {})
			expect(context.selected).toEqual(['webgl2'])
			expect(setup).toHaveBeenCalledOnce()
			Object.defineProperty(navigator, 'gpu', {configurable: true, value: undefined})
		}
	})

	it('forces WebGL 2 and reports WebGPU device loss', async() => {
		const {loseDevice} = installWebGpu()
		const canvas = document.createElement('canvas')
		const canvasContext = {configure: vi.fn(), getCurrentTexture: vi.fn()} as NativeGpuCanvasContext
		const gl = {canvas, viewport: vi.fn()} as unknown as WebGL2RenderingContext
		vi.spyOn(canvas, 'getContext').mockImplementation(((kind: string) => kind === 'webgpu' ? canvasContext : gl) as typeof canvas.getContext)

		const forced = defineGpuScene({
			manifest: manifest('webgl2'),
			webgpu: {prepare: vi.fn(() => ({}))},
			webgl2: {setup: vi.fn(() => ({}))}
		})
		const forcedContext = sceneContext(canvas)
		await forced.create().mount(forcedContext.value, {})
		expect(forcedContext.selected).toEqual(['webgl2'])

		const automatic = defineGpuScene({
			manifest: manifest(),
			webgpu: {prepare: vi.fn(() => ({}))},
			webgl2: {setup: vi.fn(() => ({}))}
		})
		const automaticContext = sceneContext(canvas)
		await automatic.create().mount(automaticContext.value, {})
		loseDevice()
		await Promise.resolve()
		expect(automaticContext.fail).toHaveBeenCalledWith('webgpu-device-lost')
	})

	it('rejects canvas2d manifests', () => {
		expect(() => defineGpuScene({
			manifest: manifest('canvas2d'),
			webgpu: {prepare: () => ({})},
			webgl2: {setup: () => ({})}
		})).toThrow(/canvas2d/)
	})
})
