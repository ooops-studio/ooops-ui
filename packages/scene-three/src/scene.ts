import {defineInteractiveScene} from '@ooopsstudio/scene-core'
import {PerspectiveCamera, Scene} from 'three'
import {WebGPURenderer} from 'three/webgpu'

import {createThreeAssetLoader} from './assets'
import {createResponsivePerspectiveCamera, resizePerspectiveCamera} from './camera'
import {createThreeResourceTracker} from './resources'
import type {DefineThreeSceneOptions, ThreeSceneDefinition} from './types'

const localDecoderPath = (value: string | undefined, name: string) => {
	if (value === undefined) return
	if (/^(?:[a-z]+:)?\/\//i.test(value) || /^(?:data|blob|javascript):/i.test(value)) {
		throw new TypeError(`${name} must be a local project path.`)
	}
}

export const defineThreeScene = <Config>(
	options: DefineThreeSceneOptions<Config>
): ThreeSceneDefinition<Config> => {
	if (options.manifest.backend === 'canvas2d') {
		throw new TypeError('Three scenes cannot use the canvas2d backend.')
	}
	localDecoderPath(options.decoders?.dracoDecoderPath, 'dracoDecoderPath')
	localDecoderPath(options.decoders?.ktx2TranscoderPath, 'ktx2TranscoderPath')
	return defineInteractiveScene({
		manifest: options.manifest,
		create: () => {
			const resources = createThreeResourceTracker()
			let renderer: WebGPURenderer | null = null
			let scene: Scene | null = null
			let camera = options.createCamera?.() ?? createResponsivePerspectiveCamera()
			let assets: ReturnType<typeof createThreeAssetLoader> | null = null
			let hooks: Awaited<ReturnType<typeof options.setup>>
			let disposed = false
			let fail: ((reason: string) => void) | null = null
			return {
				async mount(context, config) {
					fail = context.fail
					const forceWebGL = options.manifest.backend === 'webgl2'
					renderer = new WebGPURenderer({
						canvas: context.canvas,
						antialias: options.renderer?.antialias ?? true,
						alpha: options.renderer?.alpha ?? true,
						...(options.renderer?.powerPreference
							? {powerPreference: options.renderer.powerPreference}
							: {}),
						forceWebGL
					})
					await renderer.init()
					if (context.signal.aborted) throw new DOMException('Scene aborted.', 'AbortError')
					const isWebGpu = Boolean(
						(renderer as unknown as {backend?: {isWebGPUBackend?: boolean}}).backend
							?.isWebGPUBackend
					)
					context.setBackend(isWebGpu ? 'webgpu' : 'webgl2')
					scene = options.createScene?.() ?? new Scene()
					assets = createThreeAssetLoader({
						...options.decoders,
						...(options.loadingManager ? {manager: options.loadingManager} : {}),
						renderer,
						tracker: resources
					})
					hooks = await options.setup({
						context,
						renderer,
						scene,
						camera,
						assets,
						resources,
						config
					})
					const deviceLost = (
						renderer as unknown as {backend?: {device?: {lost?: Promise<unknown>}}}
					).backend?.device?.lost
					if (deviceLost) void deviceLost.then(() => {
						if (!disposed) context.fail('webgpu-device-lost')
					}).catch(() => {
						if (!disposed) context.fail('webgpu-device-lost')
					})
				},
				update: (config) => hooks?.update?.(config),
				resize(viewport) {
					renderer?.setPixelRatio(viewport.dpr)
					renderer?.setSize(viewport.width, viewport.height, false)
					if (camera instanceof PerspectiveCamera) resizePerspectiveCamera(camera, viewport)
					hooks?.resize?.(viewport)
				},
				frame(frame) {
					hooks?.frame?.(frame)
					if (!renderer || !scene) return
					try { renderer.render(scene, camera) } catch { fail?.('render-failed') }
				},
				pointer: (input) => hooks?.pointer?.(input),
				async dispose() {
					if (disposed) return
					disposed = true
					await hooks?.dispose?.()
					assets?.dispose()
					resources.dispose()
					renderer?.dispose()
					renderer = null
					scene = null
					assets = null
					fail = null
				}
			}
		}
	})
}
