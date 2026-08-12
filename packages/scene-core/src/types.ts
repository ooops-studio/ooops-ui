export const SCENE_QUALITIES = Object.freeze(['low', 'auto', 'high'] as const)
export const SCENE_REQUESTED_BACKENDS = Object.freeze(['auto', 'webgpu', 'webgl2', 'canvas2d'] as const)

export type SceneQuality = (typeof SCENE_QUALITIES)[number]
export type SceneRequestedBackend = (typeof SCENE_REQUESTED_BACKENDS)[number]
export type SceneInteractionMode = 'select' | 'interact'
export type SceneBackend = 'webgpu' | 'webgl2' | 'canvas2d' | 'unknown'
export type ScenePauseReason =
	| 'coordinator'
	| 'hidden'
	| 'manual'
	| 'navigation'
	| 'offscreen'
	| 'reduced-motion'

export type SceneViewport = Readonly<{
	width: number
	height: number
	dpr: number
}>

export type ScenePointerInput = Readonly<{
	type: 'down' | 'move' | 'up' | 'cancel'
	x: number
	y: number
	normalizedX: number
	normalizedY: number
	velocityX: number
	velocityY: number
	buttons: number
	pointerType: string
}>

export type SceneFrame = Readonly<{
	time: number
	delta: number
	viewport: SceneViewport
	scrollX: number
	scrollY: number
}>

export type SceneRuntimeState = Readonly<{
	status: 'idle' | 'mounting' | 'running' | 'paused' | 'fallback' | 'disposed'
	backend: SceneBackend
	quality: SceneQuality
	interactionMode: SceneInteractionMode
	pauseReasons: ReadonlyArray<ScenePauseReason>
	fallbackReason?: string
}>

export type InteractiveSceneContext = Readonly<{
	host: HTMLElement
	canvas: HTMLCanvasElement
	signal: AbortSignal
	audioElement?: HTMLMediaElement
	getQuality: () => SceneQuality
	getInteractionMode: () => SceneInteractionMode
	getViewport: () => SceneViewport
	setBackend: (backend: SceneBackend) => void
	fail: (reason: string) => void
}>

export type InteractiveScene<Config = unknown> = {
	mount: (context: InteractiveSceneContext, config: Readonly<Config>) => void | Promise<void>
	update?: (config: Readonly<Config>) => void | Promise<void>
	resize?: (viewport: SceneViewport) => void | Promise<void>
	frame?: (frame: SceneFrame) => void
	pointer?: (input: ScenePointerInput) => void
	pause?: (reason: ScenePauseReason) => void | Promise<void>
	resume?: () => void | Promise<void>
	dispose?: () => void | Promise<void>
}

/**
 * Runtime-only scene configuration.
 * Editor labels, controls, adapters and assets live in editor manifests.
 */
export type InteractiveSceneRuntimeManifest = Readonly<{
	id: string
	backend: SceneRequestedBackend
	quality: Readonly<{
		default: SceneQuality
		allowed: ReadonlyArray<SceneQuality>
	}>
	fallbacks: Readonly<{
		reducedMotion: 'poster' | 'static'
		contextLoss: 'poster' | 'hidden'
	}>
}>

/** @deprecated Use InteractiveSceneRuntimeManifest. */
export type InteractiveSceneManifest = InteractiveSceneRuntimeManifest

export type InteractiveSceneDefinition<Config = unknown> = Readonly<{
	manifest: InteractiveSceneRuntimeManifest
	create: () => InteractiveScene<Config>
}>

export type SceneCoordinatorRegistration = {
	setVisible: (visible: boolean) => void
	touch: () => void
	dispose: () => void
}

export type SceneCoordinator = {
	register: (
		id: string,
		onAdmissionChange: (admitted: boolean) => void
	) => SceneCoordinatorRegistration
	getActiveIds: () => ReadonlyArray<string>
	dispose: () => void
}

export type SceneHostOptions<Config> = {
	element: HTMLElement
	canvas: HTMLCanvasElement
	definition: InteractiveSceneDefinition<Config>
	config: Config
	quality?: SceneQuality
	interactionMode?: SceneInteractionMode
	coordinator?: SceneCoordinator
	audioElement?: HTMLMediaElement
	signal?: AbortSignal
	onStateChange?: (state: SceneRuntimeState) => void
}

export type SceneHost<Config> = {
	mount: () => Promise<void>
	update: (config: Config) => Promise<void>
	setQuality: (quality: SceneQuality) => void
	setInteractionMode: (mode: SceneInteractionMode) => void
	pause: () => void
	resume: () => void
	getState: () => SceneRuntimeState
	dispose: () => Promise<void>
}
