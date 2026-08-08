import type {
	InteractiveSceneContext,
	InteractiveSceneDefinition,
	InteractiveSceneManifest,
	SceneBackend,
	SceneFrame,
	ScenePointerInput,
	SceneViewport
} from '@ooopsstudio/scene-core'
import type {Camera, LoadingManager, PerspectiveCamera, Scene} from 'three'
import type {WebGPURenderer} from 'three/webgpu'

import type {ThreeAssetLoader, ThreeDecoderOptions} from './assets'
import type {ThreeResourceTracker} from './resources'

export type ThreeSceneBackend = Extract<SceneBackend, 'webgpu' | 'webgl2'>

export type ThreeRendererOptions = Readonly<{
	antialias?: boolean
	alpha?: boolean
	powerPreference?: 'low-power' | 'high-performance'
}>

export type ThreeSceneSetupContext<Config> = Readonly<{
	context: InteractiveSceneContext
	renderer: WebGPURenderer
	scene: Scene
	camera: Camera
	assets: ThreeAssetLoader
	resources: ThreeResourceTracker
	config: Readonly<Config>
}>

export type ThreeSceneSetupResult<Config> = void | Readonly<{
	update?: (config: Readonly<Config>) => void | Promise<void>
	frame?: (frame: SceneFrame) => void
	pointer?: (input: ScenePointerInput) => void
	resize?: (viewport: SceneViewport) => void
	dispose?: () => void | Promise<void>
}>

export type DefineThreeSceneOptions<Config> = Readonly<{
	manifest: InteractiveSceneManifest
	renderer?: ThreeRendererOptions
	decoders?: ThreeDecoderOptions
	loadingManager?: LoadingManager
	createScene?: () => Scene
	createCamera?: () => Camera
	setup: (
		context: ThreeSceneSetupContext<Config>
	) => ThreeSceneSetupResult<Config> | Promise<ThreeSceneSetupResult<Config>>
}>

export type ThreeSceneDefinition<Config> = InteractiveSceneDefinition<Config>

export type ResponsivePerspectiveCameraOptions = Readonly<{
	fov?: number
	near?: number
	far?: number
	position?: readonly [number, number, number]
}>

export type ThreeViewportCamera = PerspectiveCamera
