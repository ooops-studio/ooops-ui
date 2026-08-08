import {LoadingManager, TextureLoader, type Texture} from 'three'
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js'
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js'
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js'
import type {WebGPURenderer} from 'three/webgpu'

import type {ThreeResourceTracker} from './resources'
import {createThreeResourceTracker} from './resources'

export type ThreeDecoderOptions = Readonly<{
	dracoDecoderPath?: string
	ktx2TranscoderPath?: string
}>

export type ThreeAssetLoaderOptions = ThreeDecoderOptions & Readonly<{
	manager?: LoadingManager
	renderer?: WebGPURenderer
	tracker?: ThreeResourceTracker
}>

export type ThreeAssetLoader = {
	loadModel: (source: string, signal?: AbortSignal) => Promise<GLTF>
	loadTexture: (source: string, signal?: AbortSignal) => Promise<Texture>
	loadEnvironment: (source: string, signal?: AbortSignal) => Promise<Texture>
	loadKtx2: (source: string, signal?: AbortSignal) => Promise<Texture>
	dispose: () => void
}

const assertLocalAsset = (source: string) => {
	if (!source || /^(?:[a-z]+:)?\/\//i.test(source) || /^(?:data|blob|javascript):/i.test(source)) {
		throw new TypeError('Three assets must use local project paths.')
	}
}

const aborted = () => new DOMException('Asset loading was aborted.', 'AbortError')

const loadAbortable = async<Value>(
	load: () => Promise<Value>,
	signal: AbortSignal | undefined,
	disposeLate: (value: Value) => void
) => {
	if (signal?.aborted) throw aborted()
	let settled = false
	let rejectAbort: ((reason: unknown) => void) | undefined
	const abortPromise = new Promise<never>((_resolve, reject) => { rejectAbort = reject })
	const onAbort = () => rejectAbort?.(aborted())
	signal?.addEventListener('abort', onAbort, {once: true})
	const operation = load().then((value) => {
		if (signal?.aborted || settled) {
			disposeLate(value)
			throw aborted()
		}
		return value
	})
	try {
		return await (signal ? Promise.race([operation, abortPromise]) : operation)
	} finally {
		settled = true
		signal?.removeEventListener('abort', onAbort)
	}
}

export const createThreeAssetLoader = (options: ThreeAssetLoaderOptions = {}): ThreeAssetLoader => {
	const manager = options.manager ?? new LoadingManager()
	const draco = options.dracoDecoderPath ? new DRACOLoader(manager) : null
	if (draco && options.dracoDecoderPath) draco.setDecoderPath(options.dracoDecoderPath)
	const gltf = new GLTFLoader(manager)
	if (draco) gltf.setDRACOLoader(draco)
	const texture = new TextureLoader(manager)
	const hdr = new HDRLoader(manager)
	const ktx2 = options.ktx2TranscoderPath ? new KTX2Loader(manager) : null
	if (ktx2 && options.ktx2TranscoderPath) {
		ktx2.setTranscoderPath(options.ktx2TranscoderPath)
		if (options.renderer) ktx2.detectSupport(options.renderer)
	}
	const trackTexture = (value: Texture) => options.tracker?.track(value)
	return {
		async loadModel(source, signal) {
			assertLocalAsset(source)
			return loadAbortable(
				() => gltf.loadAsync(source),
				signal,
				(value) => {
					const lateResources = createThreeResourceTracker()
					lateResources.track(value.scene)
					lateResources.dispose()
				}
			).then((value) => {
				options.tracker?.track(value.scene)
				return value
			})
		},
		async loadTexture(source, signal) {
			assertLocalAsset(source)
			return loadAbortable(() => texture.loadAsync(source), signal, (value) => value.dispose())
				.then((value) => (trackTexture(value), value))
		},
		async loadEnvironment(source, signal) {
			assertLocalAsset(source)
			return loadAbortable(() => hdr.loadAsync(source), signal, (value) => value.dispose())
				.then((value) => (trackTexture(value), value))
		},
		async loadKtx2(source, signal) {
			assertLocalAsset(source)
			if (!ktx2) throw new Error('KTX2 loading requires an explicit ktx2TranscoderPath.')
			return loadAbortable(() => ktx2.loadAsync(source), signal, (value) => value.dispose())
				.then((value) => (trackTexture(value), value))
		},
		dispose() {
			draco?.dispose()
			ktx2?.dispose()
		}
	}
}
