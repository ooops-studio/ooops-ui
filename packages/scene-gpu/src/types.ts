import type {
	InteractiveSceneContext,
	InteractiveSceneDefinition,
	InteractiveSceneManifest,
	SceneFrame,
	ScenePauseReason,
	ScenePointerInput,
	SceneViewport
} from '@ooopsstudio/scene-core'

export type GpuPowerPreference = 'high-performance' | 'low-power'

export type NativeGpuBuffer = {destroy: () => void}
export type NativeGpuShaderModule = object
export type NativeGpuBindGroup = object
export type NativeGpuRenderPipeline = {getBindGroupLayout: (index: number) => object}
export type NativeGpuRenderPass = {
	setPipeline: (pipeline: NativeGpuRenderPipeline) => void
	setBindGroup: (index: number, bindGroup: NativeGpuBindGroup) => void
	draw: (vertexCount: number) => void
	end: () => void
}
export type NativeGpuCommandEncoder = {
	beginRenderPass: (descriptor: object) => NativeGpuRenderPass
	finish: () => object
}
export type NativeGpuDevice = {
	lost: Promise<{message?: string}>
	queue: {
		writeBuffer: (buffer: NativeGpuBuffer, offset: number, data: ArrayBufferView) => void
		submit: (commands: object[]) => void
	}
	createShaderModule: (descriptor: {code: string}) => NativeGpuShaderModule
	createRenderPipelineAsync: (descriptor: object) => Promise<NativeGpuRenderPipeline>
	createBuffer: (descriptor: {size: number; usage: number}) => NativeGpuBuffer
	createBindGroup: (descriptor: object) => NativeGpuBindGroup
	createCommandEncoder: () => NativeGpuCommandEncoder
}
export type NativeGpuAdapter = {requestDevice: () => Promise<NativeGpuDevice>}
export type NativeGpuApi = {
	requestAdapter: (
		options?: {powerPreference?: GpuPowerPreference}
	) => Promise<NativeGpuAdapter | null>
	getPreferredCanvasFormat: () => string
}
export type NativeGpuCanvasContext = {
	configure: (descriptor: {
		device: NativeGpuDevice
		format: string
		alphaMode: 'opaque' | 'premultiplied'
	}) => void
	getCurrentTexture: () => {createView: () => object}
}

export type GpuSceneHooks<Config> = Readonly<{
	update?: (config: Readonly<Config>) => void | Promise<void>
	resize?: (viewport: SceneViewport) => void | Promise<void>
	frame?: (frame: SceneFrame) => void
	pointer?: (input: ScenePointerInput) => void
	pause?: (reason: ScenePauseReason) => void | Promise<void>
	resume?: () => void | Promise<void>
	dispose?: () => void | Promise<void>
}>

export type PreparedWebGpuScene<Config> = GpuSceneHooks<Config> & Readonly<{
	activate?: (context: NativeGpuCanvasContext) => void | Promise<void>
}>

export type PrepareWebGpuSceneContext<Config> = Readonly<{
	canvas: HTMLCanvasElement
	context: InteractiveSceneContext
	adapter: NativeGpuAdapter
	device: NativeGpuDevice
	format: string
	config: Readonly<Config>
}>

export type SetupWebGl2SceneContext<Config> = Readonly<{
	canvas: HTMLCanvasElement
	context: InteractiveSceneContext
	gl: WebGL2RenderingContext
	config: Readonly<Config>
}>

export type DefineGpuSceneOptions<Config> = Readonly<{
	manifest: InteractiveSceneManifest
	powerPreference?: GpuPowerPreference
	alphaMode?: 'opaque' | 'premultiplied'
	webGl2ContextAttributes?: WebGLContextAttributes
	webgpu: Readonly<{
		prepare: (
			context: PrepareWebGpuSceneContext<Config>
		) => PreparedWebGpuScene<Config> | Promise<PreparedWebGpuScene<Config>>
	}>
	webgl2: Readonly<{
		setup: (
			context: SetupWebGl2SceneContext<Config>
		) => GpuSceneHooks<Config> | Promise<GpuSceneHooks<Config>>
	}>
}>

export type GpuSceneDefinition<Config> = InteractiveSceneDefinition<Config>

export type GpuResource =
	| {destroy: () => void}
	| {dispose: () => void}
	| (() => void)
	| null
	| undefined

export type GpuResourceTracker = {
	track: <Value extends GpuResource>(resource: Value) => Value
	untrack: (resource: GpuResource) => void
	dispose: () => void
}
