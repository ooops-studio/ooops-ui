export const EDITOR_SCHEMA_VERSION = 2 as const

export const EDITOR_MANIFEST_LIMITS = Object.freeze({
	issues: 50,
	components: 256,
	properties: 128,
	parts: 128,
	states: 64,
	slots: 64,
	events: 64,
	tokens: 512,
	bindings: 512,
	scenes: 128,
	extensions: 128,
	assets: 128,
	inputs: 16,
	depth: 12,
	stringLength: 2048
})

export type EditorManifestIssue = {
	path: string
	code: string
	message: string
}

export type EditorParseResult<Value> =
	| {ok: true; value: Readonly<Value>}
	| {ok: false; issues: ReadonlyArray<EditorManifestIssue>}

export type EditorControlType =
	| 'asset'
	| 'boolean'
	| 'color'
	| 'enum'
	| 'length'
	| 'number'
	| 'range'
	| 'select'
	| 'shadow'
	| 'text'

export type EditorValueSchema = {
	kind: 'boolean' | 'number' | 'string' | 'enum' | 'array' | 'object'
	values?: ReadonlyArray<string>
	min?: number
	max?: number
	step?: number
	pattern?: string
	item?: EditorValueSchema
	fields?: ReadonlyArray<EditorValueField>
}

export type EditorValueField = {
	id: string
	label: string
	required?: boolean
	schema: EditorValueSchema
}

export type EditorPropManifest = {
	id: string
	label: string
	schema: EditorValueSchema
	required?: boolean
	default?: unknown
	editable: boolean
	control?: EditorControlType
	description?: string
	asset?: {
		kinds: ReadonlyArray<'image' | 'video' | 'model' | 'environment'>
		delivery: ReadonlyArray<'astro-import' | 'public-copy'>
		altTextProp?: string
		decorativeProp?: string
	}
}

export type EditorSlotManifest = {
	id: string
	label: string
	min?: number
	max?: number
	allowedComponents?: ReadonlyArray<string>
	editable: boolean
}

export type EditorEventManifest = {
	id: string
	label: string
	detail?: EditorValueSchema
}

export const EDITOR_STYLE_PROPERTIES = Object.freeze([
	'align-content',
	'align-items',
	'align-self',
	'background-color',
	'background-image',
	'background-position',
	'background-repeat',
	'background-size',
	'border-color',
	'border-radius',
	'border-style',
	'border-width',
	'box-shadow',
	'clip-path',
	'color',
	'column-gap',
	'display',
	'flex-basis',
	'flex-direction',
	'flex-grow',
	'flex-shrink',
	'flex-wrap',
	'font-family',
	'font-size',
	'font-style',
	'font-variation-settings',
	'font-weight',
	'filter',
	'gap',
	'grid-auto-columns',
	'grid-auto-flow',
	'grid-auto-rows',
	'grid-column',
	'grid-column-end',
	'grid-column-start',
	'grid-row',
	'grid-row-end',
	'grid-row-start',
	'grid-template-columns',
	'grid-template-rows',
	'height',
	'justify-content',
	'justify-items',
	'justify-self',
	'letter-spacing',
	'line-height',
	'margin',
	'margin-block',
	'margin-block-end',
	'margin-block-start',
	'margin-inline',
	'margin-inline-end',
	'margin-inline-start',
	'max-height',
	'max-inline-size',
	'max-width',
	'min-height',
	'min-inline-size',
	'min-width',
	'opacity',
	'order',
	'object-fit',
	'object-position',
	'overflow',
	'overflow-x',
	'overflow-y',
	'padding',
	'padding-block',
	'padding-block-end',
	'padding-block-start',
	'padding-inline',
	'padding-inline-end',
	'padding-inline-start',
	'row-gap',
	'text-align',
	'text-decoration',
	'text-wrap',
	'transform',
	'aspect-ratio',
	'width'
] as const)

export type EditorStyleProperty = (typeof EDITOR_STYLE_PROPERTIES)[number]

export const EDITOR_FORCEABLE_STATES = Object.freeze([
	'hover',
	'focus-visible',
	'active',
	'open',
	'selected',
	'disabled'
] as const)

export type EditorForceableState = (typeof EDITOR_FORCEABLE_STATES)[number]

export type EditorVariableFontAxis = {
	tag: string
	label: string
	min: number
	max: number
	step: number
	default: number
}

export type EditorTypographyCapability = {
	fluidSize: boolean
	variableAxes: ReadonlyArray<EditorVariableFontAxis>
	textFit: boolean
	maxLineLength: boolean
	wrapping: ReadonlyArray<'wrap' | 'nowrap' | 'balance' | 'pretty' | 'stable'>
}

export const EDITOR_POSITION_MODES = Object.freeze([
	'static',
	'relative',
	'absolute',
	'sticky',
	'fixed'
] as const)

export const EDITOR_POSITION_OFFSETS = Object.freeze([
	'inset-block-start',
	'inset-block-end',
	'inset-inline-start',
	'inset-inline-end'
] as const)

export const EDITOR_Z_INDEX_TOKENS = Object.freeze([
	'z-index-base',
	'z-index-raised',
	'z-index-sticky',
	'z-index-dropdown',
	'z-index-overlay',
	'z-index-modal',
	'z-index-toast'
] as const)

export type EditorPositionMode = (typeof EDITOR_POSITION_MODES)[number]
export type EditorPositionOffset = (typeof EDITOR_POSITION_OFFSETS)[number]
export type EditorZIndexToken = (typeof EDITOR_Z_INDEX_TOKENS)[number]

export type EditorPositioningCapability = {
	editable: boolean
	modes: ReadonlyArray<EditorPositionMode>
	offsets: ReadonlyArray<EditorPositionOffset>
	responsive: boolean
	zIndex: {
		editable: boolean
		tokens: ReadonlyArray<EditorZIndexToken>
		allowCustom: boolean
		min?: number
		max?: number
	}
}

export type EditorPartManifest = {
	id: string
	selector: string
	states: ReadonlyArray<string>
	forceableStates?: ReadonlyArray<EditorForceableState>
	styleProperties: ReadonlyArray<EditorStyleProperty>
	responsive: boolean
	positioning: EditorPositioningCapability
	typography?: EditorTypographyCapability
}

export type EditorComponentManifest = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	id: string
	label: string
	category: string
	owner: string
	insertable: boolean
	adapters: {
		astro?: string
		svelte?: string
		controller?: string
	}
	props: ReadonlyArray<EditorPropManifest>
	slots: ReadonlyArray<EditorSlotManifest>
	events: ReadonlyArray<EditorEventManifest>
	parts: ReadonlyArray<EditorPartManifest>
	variants: ReadonlyArray<string>
}

export type AccessibilityPreferenceManifest = {
	id: string
	label: string
	type: 'toggle' | 'range'
	default: boolean | number
	min?: number
	max?: number
	step?: number
	className?: string
	cssVariable?: `--${string}`
}

export type AccessibilityEditorManifest = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	id: string
	owner: string
	storageKey: string
	persistence: 'local-storage'
	preferences: ReadonlyArray<AccessibilityPreferenceManifest>
	components: ReadonlyArray<EditorComponentManifest>
}

export type TemplateComponentReference = {
	id: string
	source: string
	manifest: string
	manifestId: string
	editorIdProp?: string
	behavior: 'canonical' | 'template'
	styleSources?: ReadonlyArray<string>
	insertion?: {
		name: string
		exportName: string
		defaultProps: Readonly<Record<string, unknown>>
	}
}

export type TemplateEditableRegion = {
	id: string
	routeId: string
	source: string
	editorId: string
	slot: string
	allowedComponents: ReadonlyArray<string>
	min: number
	max: number
}

export type TemplateContentBinding = {
	id: string
	provider: string
	mode: 'read-only'
	resource: 'single' | 'collection'
	apiId: string
	fieldPath: string
	target: string
}

export const INTERACTIVE_SCENE_BACKENDS = Object.freeze([
	'auto',
	'webgpu',
	'webgl2',
	'canvas2d'
] as const)

export const INTERACTIVE_SCENE_INPUTS = Object.freeze([
	'pointer',
	'velocity',
	'time',
	'scroll',
	'viewport',
	'audio-element'
] as const)

export const INTERACTIVE_SCENE_ASSET_KINDS = Object.freeze([
	'image',
	'video',
	'model',
	'environment'
] as const)

export const INTERACTIVE_SCENE_QUALITIES = Object.freeze(['low', 'auto', 'high'] as const)

export type InteractiveSceneBackend = (typeof INTERACTIVE_SCENE_BACKENDS)[number]
export type InteractiveSceneInput = (typeof INTERACTIVE_SCENE_INPUTS)[number]
export type InteractiveSceneAssetKind = (typeof INTERACTIVE_SCENE_ASSET_KINDS)[number]
export type InteractiveSceneQuality = (typeof INTERACTIVE_SCENE_QUALITIES)[number]

export type InteractiveSceneAsset = {
	id: string
	label: string
	kind: InteractiveSceneAssetKind
	source: string
	required: boolean
}

export type InteractiveSceneFallbacks = {
	poster: string
	description: string
	reducedMotion: 'poster' | 'static'
	contextLoss: 'poster' | 'hidden'
}

export type InteractiveSceneManifest = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	id: string
	label: string
	category: string
	owner: string
	insertable: boolean
	internals: 'locked'
	adapters: {
		astro: string
		runtime: string
	}
	backend: InteractiveSceneBackend
	controls: ReadonlyArray<EditorPropManifest>
	assets: ReadonlyArray<InteractiveSceneAsset>
	inputs: ReadonlyArray<InteractiveSceneInput>
	quality: {
		default: InteractiveSceneQuality
		allowed: ReadonlyArray<InteractiveSceneQuality>
	}
	fallbacks: InteractiveSceneFallbacks
}

export type TemplateSceneReference = {
	id: string
	source: string
	manifest: string
	manifestId: string
	editorIdProp?: string
	behavior: 'canonical' | 'template'
}

export type EditorExtensionControlBinding =
	| {kind: 'prop'; prop: string}
	| {kind: 'style'; part: string; property: EditorStyleProperty; state?: EditorForceableState}
	| {kind: 'token'; token: string; theme: 'base' | 'light' | 'dark'}

export type EditorExtensionControl = EditorPropManifest & {
	group: string
	binding: EditorExtensionControlBinding
}

export type EditorExtensionManifest = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	id: string
	label: string
	category: string
	owner: string
	targetComponents: ReadonlyArray<string>
	tab: {id: string; label: string; order?: number}
	controls: ReadonlyArray<EditorExtensionControl>
}

export type TemplateExtensionReference = {
	id: string
	manifest: string
	manifestId: string
	behavior: 'canonical' | 'template'
}

export type TemplateEditorManifest = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	id: string
	framework: {name: 'astro'; range: string; output: 'static'}
	paths: {
		sourceRoot: string
		routesRoot: string
		components: string
		designTokens: string
		generatedCss: string
		instanceOverrides?: string
	}
	themes: ReadonlyArray<{id: string; mode: 'light' | 'dark' | 'system'}>
	breakpoints: ReadonlyArray<{id: string; maxWidth?: number; minWidth?: number}>
	providers: ReadonlyArray<{id: string; package: string; mode: 'read-only'}>
	routes: ReadonlyArray<{id: string; source: string; pathname: string; dynamic: boolean}>
	components: string
	bindings: string
}

export type TemplateComponentRegistry = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	manifests: ReadonlyArray<EditorComponentManifest>
	components: ReadonlyArray<TemplateComponentReference>
	bindings: ReadonlyArray<TemplateContentBinding>
	scenes?: ReadonlyArray<TemplateSceneReference>
	extensions?: ReadonlyArray<TemplateExtensionReference>
	regions?: ReadonlyArray<TemplateEditableRegion>
}

export type TypographyStyleTokenMap = {
	fontFamily?: string
	fontSize?: string
	fontWeight?: string
	lineHeight?: string
	letterSpacing?: string
}

export type TypographyStyleManifest = {
	id: string
	label: string
	role: 'heading' | 'label' | 'body' | 'custom'
	tokens: TypographyStyleTokenMap
}

export type DesignToken = {
	id: string
	cssVariable: `--${string}`
	label: string
	category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'size' | 'component' | 'layer'
	type: 'color' | 'font-family' | 'font-weight' | 'integer' | 'length' | 'number' | 'shadow'
	value: string | number
	themeValues?: Readonly<Record<string, string | number>>
	editable: boolean
}

export type DesignTokenManifest = {
	schemaVersion: typeof EDITOR_SCHEMA_VERSION
	id: string
	themes: ReadonlyArray<{id: string; mode: 'light' | 'dark'}>
	systemTheme?: string
	tokens: ReadonlyArray<DesignToken>
	typographyStyles?: ReadonlyArray<TypographyStyleManifest>
}
