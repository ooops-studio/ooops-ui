import {
	defineInteractiveScene,
	type InteractiveSceneContext
} from '@ooopsstudio/scene-core'

import type {
	DefineGpuSceneOptions,
	GpuSceneDefinition,
	GpuSceneHooks,
	NativeGpuApi,
	NativeGpuCanvasContext,
	PreparedWebGpuScene
} from './types'

type NavigatorWithGpu = Navigator & {gpu?: NativeGpuApi}

const aborted = () => new DOMException('Scene mounting was aborted.', 'AbortError')

const defaultPowerPreference = {
	low: 'low-power',
	auto: undefined,
	high: 'high-performance'
} as const

const resolvePowerPreference = <Config>(
	options: DefineGpuSceneOptions<Config>,
	context: InteractiveSceneContext
) => typeof options.powerPreference === 'string'
	? options.powerPreference
	: options.powerPreference?.[context.getQuality()] ?? defaultPowerPreference[context.getQuality()]

export const defineGpuScene = <Config>(
	options: DefineGpuSceneOptions<Config>
): GpuSceneDefinition<Config> => {
	if (options.manifest.backend === 'canvas2d') {
		throw new TypeError('GPU scenes cannot use the canvas2d backend.')
	}

	return defineInteractiveScene({
		manifest: options.manifest,
		create: () => {
			let canvas: HTMLCanvasElement | null = null
			let hooks: GpuSceneHooks<Config> | null = null
			let gl: WebGL2RenderingContext | null = null
			let disposed = false
			let fail: ((reason: string) => void) | null = null

			const mountWebGpu = async(
				context: InteractiveSceneContext,
				config: Readonly<Config>
			) => {
				const gpu = (navigator as NavigatorWithGpu).gpu
				if (!gpu) return false
				let prepared: PreparedWebGpuScene<Config> | null = null
				let canvasCommitted = false
				try {
					const powerPreference = resolvePowerPreference(options, context)
					const adapter = await gpu.requestAdapter(
						powerPreference ? {powerPreference} : undefined
					)
					if (!adapter) return false
					const device = await adapter.requestDevice()
					const format = gpu.getPreferredCanvasFormat()
					prepared = await options.webgpu.prepare({
						canvas: context.canvas,
						context,
						adapter,
						device,
						format,
						config
					})
					if (context.signal.aborted) throw aborted()
					const canvasContext = context.canvas.getContext('webgpu') as unknown as NativeGpuCanvasContext | null
					if (!canvasContext) {
						await prepared.dispose?.()
						return false
					}
					canvasCommitted = true
					canvasContext.configure({
						device,
						format,
						alphaMode: options.alphaMode ?? 'opaque'
					})
					await prepared.activate?.(canvasContext)
					hooks = prepared
					context.setBackend('webgpu')
					void device.lost.then(() => {
						if (!disposed) context.fail('webgpu-device-lost')
					}).catch(() => {
						if (!disposed) context.fail('webgpu-device-lost')
					})
					return true
				} catch(error) {
					await prepared?.dispose?.()
					if (canvasCommitted) throw error
					return false
				}
			}

			return {
				async mount(context, config) {
					canvas = context.canvas
					fail = context.fail
					disposed = false
					if (options.manifest.backend !== 'webgl2' && await mountWebGpu(context, config)) return
					const powerPreference = resolvePowerPreference(options, context)
					gl = context.canvas.getContext('webgl2', {
						alpha: false,
						antialias: false,
						...(powerPreference ? {powerPreference} : {}),
						...options.webGl2ContextAttributes
					})
					if (!gl) {
						context.fail('gpu-backend-unavailable')
						return
					}
					hooks = await options.webgl2.setup({canvas: context.canvas, context, gl, config})
					if (context.signal.aborted) throw aborted()
					context.setBackend('webgl2')
				},
				update: (config) => hooks?.update?.(config),
				resize(viewport) {
					if (canvas) {
						const width = Math.max(1, Math.round(viewport.width * viewport.dpr))
						const height = Math.max(1, Math.round(viewport.height * viewport.dpr))
						if (canvas.width !== width) canvas.width = width
						if (canvas.height !== height) canvas.height = height
						gl?.viewport(0, 0, width, height)
					}
					return hooks?.resize?.(viewport)
				},
				frame(frame) {
					try { hooks?.frame?.(frame) } catch { fail?.('render-failed') }
				},
				pointer: (input) => hooks?.pointer?.(input),
				pause: (reason) => hooks?.pause?.(reason),
				resume: () => hooks?.resume?.(),
				async dispose() {
					if (disposed) return
					disposed = true
					await hooks?.dispose?.()
					canvas = null
					hooks = null
					gl = null
					fail = null
				}
			}
		}
	})
}
