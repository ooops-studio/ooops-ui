import {
	EDITOR_MANIFEST_LIMITS,
	EDITOR_FORCEABLE_STATES,
	INTERACTIVE_SCENE_ASSET_KINDS,
	INTERACTIVE_SCENE_BACKENDS,
	INTERACTIVE_SCENE_INPUTS,
	INTERACTIVE_SCENE_QUALITIES,
	EDITOR_POSITION_MODES,
	EDITOR_POSITION_OFFSETS,
	EDITOR_SCHEMA_VERSION,
	EDITOR_STYLE_PROPERTIES,
	EDITOR_Z_INDEX_TOKENS,
	type AccessibilityEditorManifest,
	type DesignTokenManifest,
	type EditorComponentManifest,
	type EditorExtensionManifest,
	type EditorManifestIssue,
	type EditorParseResult,
	type InteractiveSceneManifest,
	type TemplateComponentRegistry,
	type TemplateEditorManifest
} from './types'

type ManifestKind =
	| 'component'
	| 'accessibility'
	| 'template'
	| 'component-registry'
	| 'design-tokens'
	| 'extension'
	| 'scene'

const safeId = /^[A-Za-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/
const packageSpecifier = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(?:\/[A-Za-z0-9._/-]+)?$/
const relativePath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_@.[\]/-]+$/
const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype'])
const styleProperties = new Set<string>(EDITOR_STYLE_PROPERTIES)
const forceableStates = new Set<string>(EDITOR_FORCEABLE_STATES)
const positionModes = new Set<string>(EDITOR_POSITION_MODES)
const positionOffsets = new Set<string>(EDITOR_POSITION_OFFSETS)
const zIndexTokens = new Set<string>(EDITOR_Z_INDEX_TOKENS)
const sceneBackends = new Set<string>(INTERACTIVE_SCENE_BACKENDS)
const sceneInputs = new Set<string>(INTERACTIVE_SCENE_INPUTS)
const sceneAssetKinds = new Set<string>(INTERACTIVE_SCENE_ASSET_KINDS)
const sceneQualities = new Set<string>(INTERACTIVE_SCENE_QUALITIES)
const sceneAssetExtensions = Object.freeze({
	image: new Set(['png', 'jpg', 'jpeg', 'webp', 'avif']),
	video: new Set(['mp4', 'webm']),
	model: new Set(['glb', 'gltf']),
	environment: new Set(['hdr', 'ktx2'])
})

export const validateComponentManifest = (value: unknown): value is EditorComponentManifest =>
	validate(value, 'component').length === 0

export const validateAccessibilityManifest = (
	value: unknown
): value is AccessibilityEditorManifest =>
	validate(value, 'accessibility').length === 0

export const validateTemplateManifest = (value: unknown): value is TemplateEditorManifest =>
	validate(value, 'template').length === 0

export const validateTemplateComponentRegistry = (
	value: unknown
): value is TemplateComponentRegistry =>
	validate(value, 'component-registry').length === 0

export const validateDesignTokenManifest = (value: unknown): value is DesignTokenManifest =>
	validate(value, 'design-tokens').length === 0

export const validateInteractiveSceneManifest = (
	value: unknown
): value is InteractiveSceneManifest =>
	validate(value, 'scene').length === 0

export const validateEditorExtensionManifest = (
	value: unknown
): value is EditorExtensionManifest => validate(value, 'extension').length === 0

export const parseComponentManifest = (
	value: unknown
): EditorParseResult<EditorComponentManifest> =>
	parse(value, 'component')

export const parseAccessibilityManifest = (
	value: unknown
): EditorParseResult<AccessibilityEditorManifest> =>
	parse(value, 'accessibility')

export const parseTemplateManifest = (value: unknown): EditorParseResult<TemplateEditorManifest> =>
	parse(value, 'template')

export const parseTemplateComponentRegistry = (
	value: unknown
): EditorParseResult<TemplateComponentRegistry> =>
	parse(value, 'component-registry')

export const parseDesignTokenManifest = (value: unknown): EditorParseResult<DesignTokenManifest> =>
	parse(value, 'design-tokens')

export const parseInteractiveSceneManifest = (
	value: unknown
): EditorParseResult<InteractiveSceneManifest> =>
	parse(value, 'scene')

export const parseEditorExtensionManifest = (
	value: unknown
): EditorParseResult<EditorExtensionManifest> => parse(value, 'extension')

const parse = <Value>(value: unknown, kind: ManifestKind): EditorParseResult<Value> => {
	const issues = validate(value, kind)
	if (issues.length > 0) return {ok: false, issues: Object.freeze(issues)}
	return {ok: true, value: deepFreeze(cloneJson(value)) as Readonly<Value>}
}

const validate = (value: unknown, kind: ManifestKind): EditorManifestIssue[] => {
	const issues: EditorManifestIssue[] = []
	inspectJson(value, '$', 0, new WeakSet(), issues)
	if (!isRecord(value)) {
		add(issues, '$', 'type', 'Manifest must be an object.')
		return issues
	}
	if (value.schemaVersion !== EDITOR_SCHEMA_VERSION) add(issues, '$.schemaVersion', 'version', 'schemaVersion must be 2.')

	switch (kind) {
		case 'component': validateComponent(value, '$', issues); break
		case 'accessibility': validateAccessibility(value, issues); break
		case 'template': validateTemplate(value, issues); break
		case 'component-registry': validateRegistry(value, issues); break
		case 'design-tokens': validateTokens(value, issues); break
		case 'extension': validateExtension(value, issues); break
		case 'scene': validateScene(value, issues); break
	}
	return issues.slice(0, EDITOR_MANIFEST_LIMITS.issues)
}

const validateComponent = (
	value: Record<string, unknown>,
	path: string,
	issues: EditorManifestIssue[]
) => {
	knownKeys(value, [
		'schemaVersion', 'id', 'label', 'category', 'owner', 'insertable', 'adapters',
		'props', 'slots', 'events', 'parts', 'variants'
	], path, issues)
	stringId(value.id, `${path}.id`, issues)
	stringValue(value.label, `${path}.label`, issues)
	stringValue(value.category, `${path}.category`, issues)
	packageValue(value.owner, `${path}.owner`, issues)
	if (typeof value.insertable !== 'boolean') add(issues, `${path}.insertable`, 'type', 'insertable must be boolean.')
	if (!isRecord(value.adapters)) add(issues, `${path}.adapters`, 'type', 'adapters must be an object.')
	else for (const [key, specifier] of Object.entries(value.adapters)) {
		if (!['astro', 'svelte', 'controller'].includes(key)) add(issues, `${path}.adapters.${key}`, 'unknown', 'Unknown adapter key.')
		else packageValue(specifier, `${path}.adapters.${key}`, issues)
	}

	array(value.props, `${path}.props`, EDITOR_MANIFEST_LIMITS.properties, issues, (item, itemPath) => {
		if (!isRecord(item)) return add(issues, itemPath, 'type', 'Prop must be an object.')
		knownKeys(item, ['id', 'label', 'schema', 'required', 'default', 'editable', 'control', 'description', 'asset'], itemPath, issues)
		stringId(item.id, `${itemPath}.id`, issues)
		stringValue(item.label, `${itemPath}.label`, issues)
		if (typeof item.editable !== 'boolean') add(issues, `${itemPath}.editable`, 'type', 'editable must be boolean.')
		validateValueSchema(item.schema, `${itemPath}.schema`, issues, 0)
		if (item.asset !== undefined) validateAssetCapability(item.asset, `${itemPath}.asset`, issues)
	})
	uniqueIds(value.props, `${path}.props`, issues)

	array(value.slots, `${path}.slots`, EDITOR_MANIFEST_LIMITS.slots, issues, (item, itemPath) => {
		if (!isRecord(item)) return add(issues, itemPath, 'type', 'Slot must be an object.')
		knownKeys(item, ['id', 'label', 'min', 'max', 'allowedComponents', 'editable'], itemPath, issues)
		stringId(item.id, `${itemPath}.id`, issues)
		stringValue(item.label, `${itemPath}.label`, issues)
		if (typeof item.editable !== 'boolean') add(issues, `${itemPath}.editable`, 'type', 'editable must be boolean.')
	})
	uniqueIds(value.slots, `${path}.slots`, issues)

	array(value.events, `${path}.events`, EDITOR_MANIFEST_LIMITS.events, issues, (item, itemPath) => {
		if (!isRecord(item)) return add(issues, itemPath, 'type', 'Event must be an object.')
		knownKeys(item, ['id', 'label', 'detail'], itemPath, issues)
		stringId(item.id, `${itemPath}.id`, issues)
		stringValue(item.label, `${itemPath}.label`, issues)
		if (item.detail !== undefined) validateValueSchema(item.detail, `${itemPath}.detail`, issues, 0)
	})
	uniqueIds(value.events, `${path}.events`, issues)

	array(value.parts, `${path}.parts`, EDITOR_MANIFEST_LIMITS.parts, issues, (item, itemPath) => {
		if (!isRecord(item)) return add(issues, itemPath, 'type', 'Part must be an object.')
		knownKeys(item, ['id', 'selector', 'states', 'forceableStates', 'styleProperties', 'responsive', 'positioning', 'typography'], itemPath, issues)
		stringId(item.id, `${itemPath}.id`, issues)
		stringValue(item.selector, `${itemPath}.selector`, issues)
		if (typeof item.responsive !== 'boolean') add(issues, `${itemPath}.responsive`, 'type', 'responsive must be boolean.')
		stringArray(item.states, `${itemPath}.states`, EDITOR_MANIFEST_LIMITS.states, issues)
		if (item.forceableStates !== undefined) {
			stringArray(item.forceableStates, `${itemPath}.forceableStates`, EDITOR_FORCEABLE_STATES.length, issues)
			if (Array.isArray(item.forceableStates)) item.forceableStates.forEach((state, index) => {
				if (typeof state === 'string' && !forceableStates.has(state)) add(issues, `${itemPath}.forceableStates[${index}]`, 'state', `Unsupported forceable state: ${state}.`)
				if (typeof state === 'string' && Array.isArray(item.states) && !item.states.includes(state)) add(issues, `${itemPath}.forceableStates[${index}]`, 'reference', 'Forceable state must also be declared in states.')
			})
		}
		stringArray(item.styleProperties, `${itemPath}.styleProperties`, EDITOR_MANIFEST_LIMITS.properties, issues)
		if (Array.isArray(item.styleProperties)) item.styleProperties.forEach((property, index) => {
			if (typeof property === 'string' && !styleProperties.has(property)) add(issues, `${itemPath}.styleProperties[${index}]`, 'style-property', `Unsupported style property: ${property}.`)
		})
		validatePositioning(item.positioning, `${itemPath}.positioning`, issues)
		if (item.typography !== undefined) validateTypography(item.typography, `${itemPath}.typography`, issues)
	})
	uniqueIds(value.parts, `${path}.parts`, issues)
	stringArray(value.variants, `${path}.variants`, EDITOR_MANIFEST_LIMITS.states, issues)
}

const validateAccessibility = (value: Record<string, unknown>, issues: EditorManifestIssue[]) => {
	knownKeys(value, ['schemaVersion', 'id', 'owner', 'storageKey', 'persistence', 'preferences', 'components'], '$', issues)
	stringId(value.id, '$.id', issues)
	packageValue(value.owner, '$.owner', issues)
	stringValue(value.storageKey, '$.storageKey', issues)
	if (value.persistence !== 'local-storage') add(issues, '$.persistence', 'value', 'persistence must be local-storage.')
	array(value.preferences, '$.preferences', EDITOR_MANIFEST_LIMITS.properties, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Preference must be an object.')
		knownKeys(item, ['id', 'label', 'type', 'default', 'min', 'max', 'step', 'className', 'cssVariable'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		stringValue(item.label, `${path}.label`, issues)
		if (!['toggle', 'range'].includes(String(item.type))) add(issues, `${path}.type`, 'value', 'Preference type must be toggle or range.')
		if (item.type === 'toggle' && typeof item.default !== 'boolean') add(issues, `${path}.default`, 'type', 'Toggle default must be boolean.')
		if (item.type === 'range' && typeof item.default !== 'number') add(issues, `${path}.default`, 'type', 'Range default must be number.')
		if (item.className !== undefined) stringValue(item.className, `${path}.className`, issues)
		if (item.cssVariable !== undefined && (typeof item.cssVariable !== 'string' || !item.cssVariable.startsWith('--'))) add(issues, `${path}.cssVariable`, 'value', 'cssVariable must be a custom property.')
	})
	uniqueIds(value.preferences, '$.preferences', issues)
	array(value.components, '$.components', EDITOR_MANIFEST_LIMITS.components, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Component must be an object.')
		validateComponent(item, path, issues)
	})
	uniqueIds(value.components, '$.components', issues)
}

const validateTemplate = (value: Record<string, unknown>, issues: EditorManifestIssue[]) => {
	knownKeys(value, ['schemaVersion', 'id', 'framework', 'paths', 'themes', 'breakpoints', 'providers', 'routes', 'components', 'bindings'], '$', issues)
	stringId(value.id, '$.id', issues)
	if (!isRecord(value.framework) || value.framework.name !== 'astro' || value.framework.output !== 'static') add(issues, '$.framework', 'value', 'Framework must describe static Astro.')
	else knownKeys(value.framework, ['name', 'range', 'output'], '$.framework', issues)
	if (!isRecord(value.paths)) add(issues, '$.paths', 'type', 'paths must be an object.')
	else {
		knownKeys(value.paths, ['sourceRoot', 'routesRoot', 'components', 'designTokens', 'generatedCss', 'instanceOverrides'], '$.paths', issues)
		for (const key of ['sourceRoot', 'routesRoot', 'components', 'designTokens', 'generatedCss']) pathValue(value.paths[key], `$.paths.${key}`, issues)
		if (value.paths.instanceOverrides !== undefined) {
			pathValue(value.paths.instanceOverrides, '$.paths.instanceOverrides', issues)
		}
	}
	array(value.themes, '$.themes', 16, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Theme must be an object.')
		knownKeys(item, ['id', 'mode'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		if (!['light', 'dark', 'system'].includes(String(item.mode))) add(issues, `${path}.mode`, 'value', 'Unsupported theme mode.')
	})
	uniqueIds(value.themes, '$.themes', issues)
	array(value.breakpoints, '$.breakpoints', 32, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Breakpoint must be an object.')
		knownKeys(item, ['id', 'minWidth', 'maxWidth'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		if (item.minWidth === undefined && item.maxWidth === undefined) add(issues, path, 'value', 'Breakpoint needs minWidth or maxWidth.')
	})
	uniqueIds(value.breakpoints, '$.breakpoints', issues)
	array(value.providers, '$.providers', 32, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Provider must be an object.')
		knownKeys(item, ['id', 'package', 'mode'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		packageValue(item.package, `${path}.package`, issues)
		if (item.mode !== 'read-only') add(issues, `${path}.mode`, 'value', 'Providers must be read-only.')
	})
	array(value.routes, '$.routes', 256, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Route must be an object.')
		knownKeys(item, ['id', 'source', 'pathname', 'dynamic'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		pathValue(item.source, `${path}.source`, issues)
		if (typeof item.pathname !== 'string' || !item.pathname.startsWith('/')) add(issues, `${path}.pathname`, 'value', 'pathname must start with /.')
		if (typeof item.dynamic !== 'boolean') add(issues, `${path}.dynamic`, 'type', 'dynamic must be boolean.')
	})
	uniqueIds(value.routes, '$.routes', issues)
	pathValue(value.components, '$.components', issues)
	pathValue(value.bindings, '$.bindings', issues)
}

const validateRegistry = (value: Record<string, unknown>, issues: EditorManifestIssue[]) => {
	knownKeys(value, ['schemaVersion', 'manifests', 'components', 'bindings', 'scenes', 'extensions', 'regions'], '$', issues)
	array(value.manifests, '$.manifests', EDITOR_MANIFEST_LIMITS.components, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Component manifest must be an object.')
		validateComponent(item, path, issues)
	})
	uniqueIds(value.manifests, '$.manifests', issues)
	array(value.components, '$.components', EDITOR_MANIFEST_LIMITS.components, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Component reference must be an object.')
		knownKeys(item, [
			'id', 'source', 'manifest', 'manifestId', 'editorIdProp', 'behavior',
			'styleSources', 'insertion'
		], path, issues)
		stringId(item.id, `${path}.id`, issues)
		pathValue(item.source, `${path}.source`, issues)
		if (item.behavior === 'template') pathValue(item.manifest, `${path}.manifest`, issues)
		else packageValue(item.manifest, `${path}.manifest`, issues)
		stringId(item.manifestId, `${path}.manifestId`, issues)
		if (!['canonical', 'template'].includes(String(item.behavior))) add(issues, `${path}.behavior`, 'value', 'behavior must be canonical or template.')
		if (item.styleSources !== undefined) {
			array(item.styleSources, `${path}.styleSources`, 16, issues, (source, sourcePath) => {
				pathValue(source, sourcePath, issues)
			})
		}
		if (item.insertion !== undefined) {
			if (!isRecord(item.insertion)) {
				add(issues, `${path}.insertion`, 'type', 'insertion must be an object.')
			} else {
				knownKeys(item.insertion, ['name', 'exportName', 'defaultProps'], `${path}.insertion`, issues)
				stringId(item.insertion.name, `${path}.insertion.name`, issues)
				if (item.insertion.exportName !== 'default') {
					stringId(item.insertion.exportName, `${path}.insertion.exportName`, issues)
				}
				if (!isRecord(item.insertion.defaultProps)) {
					add(issues, `${path}.insertion.defaultProps`, 'type', 'defaultProps must be an object.')
				}
			}
		}
	})
	uniqueIds(value.components, '$.components', issues)
	array(value.bindings, '$.bindings', EDITOR_MANIFEST_LIMITS.bindings, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Binding must be an object.')
		knownKeys(item, ['id', 'provider', 'mode', 'resource', 'apiId', 'fieldPath', 'target'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		stringId(item.provider, `${path}.provider`, issues)
		if (item.mode !== 'read-only') add(issues, `${path}.mode`, 'value', 'Bindings must be read-only.')
		if (!['single', 'collection'].includes(String(item.resource))) add(issues, `${path}.resource`, 'value', 'Unsupported resource type.')
		stringId(item.apiId, `${path}.apiId`, issues)
		stringValue(item.fieldPath, `${path}.fieldPath`, issues)
		stringValue(item.target, `${path}.target`, issues)
	})
	uniqueIds(value.bindings, '$.bindings', issues)
	if (value.scenes !== undefined) {
		array(value.scenes, '$.scenes', EDITOR_MANIFEST_LIMITS.scenes, issues, (item, path) => {
			if (!isRecord(item)) return add(issues, path, 'type', 'Scene reference must be an object.')
			knownKeys(
				item,
				['id', 'source', 'manifest', 'manifestId', 'editorIdProp', 'behavior'],
				path,
				issues
			)
			stringId(item.id, `${path}.id`, issues)
			pathValue(item.source, `${path}.source`, issues)
			if (item.behavior === 'template') pathValue(item.manifest, `${path}.manifest`, issues)
			else packageValue(item.manifest, `${path}.manifest`, issues)
			stringId(item.manifestId, `${path}.manifestId`, issues)
			if (!['canonical', 'template'].includes(String(item.behavior))) {
				add(issues, `${path}.behavior`, 'value', 'behavior must be canonical or template.')
			}
		})
		uniqueIds(value.scenes, '$.scenes', issues)
	}
	if (value.extensions !== undefined) {
		array(value.extensions, '$.extensions', EDITOR_MANIFEST_LIMITS.extensions, issues, (item, path) => {
			if (!isRecord(item)) return add(issues, path, 'type', 'Extension reference must be an object.')
			knownKeys(item, ['id', 'manifest', 'manifestId', 'behavior'], path, issues)
			stringId(item.id, `${path}.id`, issues)
			if (item.behavior === 'template') pathValue(item.manifest, `${path}.manifest`, issues)
			else packageValue(item.manifest, `${path}.manifest`, issues)
			stringId(item.manifestId, `${path}.manifestId`, issues)
			if (!['canonical', 'template'].includes(String(item.behavior))) add(issues, `${path}.behavior`, 'value', 'behavior must be canonical or template.')
		})
		uniqueIds(value.extensions, '$.extensions', issues)
	}
	if (value.regions !== undefined) {
		array(value.regions, '$.regions', EDITOR_MANIFEST_LIMITS.components, issues, (item, path) => {
			if (!isRecord(item)) return add(issues, path, 'type', 'Editable region must be an object.')
			knownKeys(
				item,
				['id', 'routeId', 'source', 'editorId', 'slot', 'allowedComponents', 'min', 'max'],
				path,
				issues
			)
			stringId(item.id, `${path}.id`, issues)
			stringId(item.routeId, `${path}.routeId`, issues)
			pathValue(item.source, `${path}.source`, issues)
			stringId(item.editorId, `${path}.editorId`, issues)
			stringId(item.slot, `${path}.slot`, issues)
			stringArray(
				item.allowedComponents,
				`${path}.allowedComponents`,
				EDITOR_MANIFEST_LIMITS.components,
				issues
			)
			if (!Number.isInteger(item.min) || (item.min as number) < 0) {
				add(issues, `${path}.min`, 'bounds', 'min must be a non-negative integer.')
			}
			if (!Number.isInteger(item.max) || (item.max as number) < 1) {
				add(issues, `${path}.max`, 'bounds', 'max must be a positive integer.')
			}
			if (Number.isInteger(item.min) && Number.isInteger(item.max) &&
				(item.min as number) > (item.max as number)) {
				add(issues, path, 'bounds', 'min cannot exceed max.')
			}
		})
		uniqueIds(value.regions, '$.regions', issues)
		if (Array.isArray(value.regions)) {
			const componentIds = new Set(
				Array.isArray(value.components)
					? value.components.filter(isRecord).map((component) => component.id).filter((id): id is string => typeof id === 'string')
					: []
			)
			value.regions.forEach((region, index) => {
				if (!isRecord(region)) return
				if (Array.isArray(region.allowedComponents)) {
					region.allowedComponents.forEach((component, componentIndex) => {
						if (typeof component === 'string' && !componentIds.has(component)) {
							add(
								issues,
								`$.regions[${index}].allowedComponents[${componentIndex}]`,
								'reference',
								'Unknown component reference.'
							)
						}
					})
				}
			})
		}
	}
}

const validateScene = (value: Record<string, unknown>, issues: EditorManifestIssue[]) => {
	knownKeys(value, [
		'schemaVersion', 'id', 'label', 'category', 'owner', 'insertable', 'internals',
		'adapters', 'backend', 'controls', 'assets', 'inputs', 'quality', 'fallbacks'
	], '$', issues)
	stringId(value.id, '$.id', issues)
	stringValue(value.label, '$.label', issues)
	stringValue(value.category, '$.category', issues)
	packageValue(value.owner, '$.owner', issues)
	if (typeof value.insertable !== 'boolean') {
		add(issues, '$.insertable', 'type', 'insertable must be boolean.')
	}
	if (value.internals !== 'locked') {
		add(issues, '$.internals', 'value', 'Scene internals must be locked.')
	}
	if (!isRecord(value.adapters)) add(issues, '$.adapters', 'type', 'adapters must be an object.')
	else {
		knownKeys(value.adapters, ['astro', 'runtime'], '$.adapters', issues)
		packageValue(value.adapters.astro, '$.adapters.astro', issues)
		packageValue(value.adapters.runtime, '$.adapters.runtime', issues)
	}
	if (typeof value.backend !== 'string' || !sceneBackends.has(value.backend)) {
		add(issues, '$.backend', 'value', 'Unsupported scene backend.')
	}
	array(value.controls, '$.controls', EDITOR_MANIFEST_LIMITS.properties, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Scene control must be an object.')
		knownKeys(
			item,
			['id', 'label', 'schema', 'required', 'default', 'editable', 'control', 'description'],
			path,
			issues
		)
		stringId(item.id, `${path}.id`, issues)
		stringValue(item.label, `${path}.label`, issues)
		if (item.editable !== true) {
			add(issues, `${path}.editable`, 'value', 'Scene manifest controls must be editable.')
		}
		validateValueSchema(item.schema, `${path}.schema`, issues, 0)
	})
	uniqueIds(value.controls, '$.controls', issues)
	array(value.assets, '$.assets', EDITOR_MANIFEST_LIMITS.assets, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Scene asset must be an object.')
		knownKeys(item, ['id', 'label', 'kind', 'source', 'required'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		stringValue(item.label, `${path}.label`, issues)
		if (typeof item.kind !== 'string' || !sceneAssetKinds.has(item.kind)) {
			add(issues, `${path}.kind`, 'value', 'Unsupported scene asset kind.')
		}
		validateSceneAssetSource(item.source, item.kind, `${path}.source`, issues)
		if (typeof item.required !== 'boolean') {
			add(issues, `${path}.required`, 'type', 'required must be boolean.')
		}
	})
	uniqueIds(value.assets, '$.assets', issues)
	stringArray(value.inputs, '$.inputs', EDITOR_MANIFEST_LIMITS.inputs, issues)
	if (Array.isArray(value.inputs)) value.inputs.forEach((input, index) => {
		if (typeof input === 'string' && !sceneInputs.has(input)) {
			add(issues, `$.inputs[${index}]`, 'value', `Unsupported scene input: ${input}.`)
		}
	})
	if (!isRecord(value.quality)) add(issues, '$.quality', 'type', 'quality must be an object.')
	else {
		knownKeys(value.quality, ['default', 'allowed'], '$.quality', issues)
		if (typeof value.quality.default !== 'string' || !sceneQualities.has(value.quality.default)) {
			add(issues, '$.quality.default', 'value', 'Unsupported default scene quality.')
		}
		stringArray(value.quality.allowed, '$.quality.allowed', sceneQualities.size, issues)
		if (Array.isArray(value.quality.allowed)) {
			for (const [index, quality] of value.quality.allowed.entries()) {
				if (typeof quality === 'string' && !sceneQualities.has(quality)) {
					add(issues, `$.quality.allowed[${index}]`, 'value', 'Unsupported scene quality.')
				}
			}
			if (!value.quality.allowed.includes(value.quality.default)) {
				add(issues, '$.quality.default', 'reference', 'Default quality must be allowed.')
			}
		}
	}
	if (!isRecord(value.fallbacks)) add(issues, '$.fallbacks', 'type', 'fallbacks must be an object.')
	else {
		knownKeys(
			value.fallbacks,
			['poster', 'description', 'reducedMotion', 'contextLoss'],
			'$.fallbacks',
			issues
		)
		validateSceneAssetSource(value.fallbacks.poster, 'image', '$.fallbacks.poster', issues)
		stringValue(value.fallbacks.description, '$.fallbacks.description', issues)
		if (!['poster', 'static'].includes(String(value.fallbacks.reducedMotion))) {
			add(issues, '$.fallbacks.reducedMotion', 'value', 'Unsupported reduced-motion fallback.')
		}
		if (!['poster', 'hidden'].includes(String(value.fallbacks.contextLoss))) {
			add(issues, '$.fallbacks.contextLoss', 'value', 'Unsupported context-loss fallback.')
		}
	}
}

const validateSceneAssetSource = (
	value: unknown,
	kind: unknown,
	path: string,
	issues: EditorManifestIssue[]
) => {
	pathValue(value, path, issues)
	if (typeof value !== 'string' || typeof kind !== 'string') return
	if (/^(?:https?:|data:|blob:|javascript:)/i.test(value)) {
		return add(issues, path, 'asset-source', 'Scene assets must be local project paths.')
	}
	const extension = value.split(/[?#]/, 1)[0]?.split('.').pop()?.toLowerCase()
	const allowed = sceneAssetExtensions[kind as keyof typeof sceneAssetExtensions]
	if (!extension || !allowed?.has(extension)) {
		add(issues, path, 'asset-extension', `Unsupported ${kind} asset extension.`)
	}
}

const validateTokens = (value: Record<string, unknown>, issues: EditorManifestIssue[]) => {
	knownKeys(value, ['schemaVersion', 'id', 'themes', 'systemTheme', 'tokens', 'typographyStyles'], '$', issues)
	stringId(value.id, '$.id', issues)
	array(value.themes, '$.themes', 16, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Theme must be an object.')
		knownKeys(item, ['id', 'mode'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		if (!['light', 'dark'].includes(String(item.mode))) add(issues, `${path}.mode`, 'value', 'Token theme must be light or dark.')
	})
	uniqueIds(value.themes, '$.themes', issues)
	if (value.systemTheme !== undefined) {
		stringId(value.systemTheme, '$.systemTheme', issues)
		if (Array.isArray(value.themes) && !value.themes.some((theme) => isRecord(theme) && theme.id === value.systemTheme)) add(issues, '$.systemTheme', 'reference', 'systemTheme must reference a declared theme.')
	}
	array(value.tokens, '$.tokens', EDITOR_MANIFEST_LIMITS.tokens, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Token must be an object.')
		knownKeys(item, ['id', 'cssVariable', 'label', 'category', 'type', 'value', 'themeValues', 'editable'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		if (typeof item.cssVariable !== 'string' || !/^--[a-z][a-z0-9-]*$/.test(item.cssVariable)) add(issues, `${path}.cssVariable`, 'value', 'Invalid CSS custom property.')
		stringValue(item.label, `${path}.label`, issues)
		if (!['color', 'typography', 'spacing', 'radius', 'shadow', 'size', 'component', 'layer'].includes(String(item.category))) add(issues, `${path}.category`, 'value', 'Unsupported token category.')
		if (!['color', 'font-family', 'font-weight', 'integer', 'length', 'number', 'shadow'].includes(String(item.type))) add(issues, `${path}.type`, 'value', 'Unsupported token type.')
		if (typeof item.editable !== 'boolean') add(issues, `${path}.editable`, 'type', 'editable must be boolean.')
		validateCssValue(item.value, `${path}.value`, issues)
		if (item.type === 'integer' && (!Number.isInteger(item.value) || typeof item.value !== 'number')) add(issues, `${path}.value`, 'integer', 'Integer tokens require an integer value.')
		if (item.category === 'layer' && item.type !== 'integer') add(issues, `${path}.type`, 'value', 'Layer tokens must use the integer type.')
		if (isRecord(item.themeValues)) for (
			const [theme, tokenValue] of Object.entries(item.themeValues)
		) {
			stringId(theme, `${path}.themeValues`, issues)
			validateCssValue(tokenValue, `${path}.themeValues.${theme}`, issues)
		}
	})
	uniqueIds(value.tokens, '$.tokens', issues)
	if (value.typographyStyles !== undefined) {
		array(value.typographyStyles, '$.typographyStyles', 64, issues, (item, path) => {
			if (!isRecord(item)) return add(issues, path, 'type', 'Typography style must be an object.')
			knownKeys(item, ['id', 'label', 'role', 'tokens'], path, issues)
			stringId(item.id, `${path}.id`, issues)
			stringValue(item.label, `${path}.label`, issues)
			if (!['heading', 'label', 'body', 'custom'].includes(String(item.role))) add(issues, `${path}.role`, 'value', 'Unsupported typography role.')
			if (!isRecord(item.tokens)) return add(issues, `${path}.tokens`, 'type', 'Typography style tokens must be an object.')
			knownKeys(item.tokens, ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'], `${path}.tokens`, issues)
			for (const [name, tokenId] of Object.entries(item.tokens)) {
				stringId(tokenId, `${path}.tokens.${name}`, issues)
				const token = Array.isArray(value.tokens)
					? value.tokens.find((entry) => isRecord(entry) && entry.id === tokenId)
					: undefined
				if (!isRecord(token) || token.category !== 'typography') add(issues, `${path}.tokens.${name}`, 'reference', 'Typography styles may reference only declared typography tokens.')
			}
		})
		uniqueIds(value.typographyStyles, '$.typographyStyles', issues)
	}
}

const validateExtension = (value: Record<string, unknown>, issues: EditorManifestIssue[]) => {
	knownKeys(value, ['schemaVersion', 'id', 'label', 'category', 'owner', 'targetComponents', 'tab', 'controls'], '$', issues)
	stringId(value.id, '$.id', issues)
	stringValue(value.label, '$.label', issues)
	stringValue(value.category, '$.category', issues)
	packageValue(value.owner, '$.owner', issues)
	stringArray(value.targetComponents, '$.targetComponents', EDITOR_MANIFEST_LIMITS.components, issues)
	if (Array.isArray(value.targetComponents) && value.targetComponents.length === 0) add(issues, '$.targetComponents', 'limit', 'An extension must target at least one component.')
	if (!isRecord(value.tab)) add(issues, '$.tab', 'type', 'tab must be an object.')
	else {
		knownKeys(value.tab, ['id', 'label', 'order'], '$.tab', issues)
		stringId(value.tab.id, '$.tab.id', issues)
		stringValue(value.tab.label, '$.tab.label', issues)
		if (value.tab.order !== undefined && (!Number.isInteger(value.tab.order) || (value.tab.order as number) < 0 || (value.tab.order as number) > 1000)) add(issues, '$.tab.order', 'bounds', 'Tab order must be an integer between 0 and 1000.')
	}
	array(value.controls, '$.controls', EDITOR_MANIFEST_LIMITS.properties, issues, (item, path) => {
		if (!isRecord(item)) return add(issues, path, 'type', 'Extension control must be an object.')
		knownKeys(item, ['id', 'label', 'schema', 'required', 'default', 'editable', 'control', 'description', 'asset', 'group', 'binding'], path, issues)
		stringId(item.id, `${path}.id`, issues)
		stringValue(item.label, `${path}.label`, issues)
		stringId(item.group, `${path}.group`, issues)
		if (item.editable !== true) add(issues, `${path}.editable`, 'value', 'Extension controls must be editable.')
		validateValueSchema(item.schema, `${path}.schema`, issues, 0)
		if (item.asset !== undefined) validateAssetCapability(item.asset, `${path}.asset`, issues)
		if (item.control === 'asset' && item.asset === undefined) add(issues, `${path}.asset`, 'required', 'Asset controls must declare accepted kinds and delivery.')
		if (item.asset !== undefined && item.control !== 'asset') add(issues, `${path}.control`, 'value', 'Asset metadata requires an asset control.')
		if (item.control === 'asset' && (!isRecord(item.schema) || item.schema.kind !== 'string')) add(issues, `${path}.schema`, 'value', 'Asset controls require a string value schema.')
		if (!isRecord(item.binding)) return add(issues, `${path}.binding`, 'type', 'Control binding must be an object.')
		if (item.control === 'asset' && item.binding.kind !== 'prop') add(issues, `${path}.binding`, 'value', 'Asset controls must bind to a component prop.')
		if (item.binding.kind === 'prop') {
			knownKeys(item.binding, ['kind', 'prop'], `${path}.binding`, issues)
			stringId(item.binding.prop, `${path}.binding.prop`, issues)
		} else if (item.binding.kind === 'style') {
			knownKeys(item.binding, ['kind', 'part', 'property', 'state'], `${path}.binding`, issues)
			stringId(item.binding.part, `${path}.binding.part`, issues)
			if (typeof item.binding.property !== 'string' || !styleProperties.has(item.binding.property)) add(issues, `${path}.binding.property`, 'style-property', 'Extension style binding uses an unsupported property.')
			if (item.binding.state !== undefined && (typeof item.binding.state !== 'string' || !forceableStates.has(item.binding.state))) add(issues, `${path}.binding.state`, 'state', 'Extension style binding uses an unsupported state.')
		} else if (item.binding.kind === 'token') {
			knownKeys(item.binding, ['kind', 'token', 'theme'], `${path}.binding`, issues)
			stringId(item.binding.token, `${path}.binding.token`, issues)
			if (!['base', 'light', 'dark'].includes(String(item.binding.theme))) add(issues, `${path}.binding.theme`, 'value', 'Unsupported token theme.')
		} else add(issues, `${path}.binding.kind`, 'value', 'Unsupported extension binding kind.')
	})
	uniqueIds(value.controls, '$.controls', issues)
}

const validateAssetCapability = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (!isRecord(value)) return add(issues, path, 'type', 'asset must be an object.')
	knownKeys(value, ['kinds', 'delivery', 'altTextProp', 'decorativeProp'], path, issues)
	stringArray(value.kinds, `${path}.kinds`, 4, issues)
	if (Array.isArray(value.kinds)) value.kinds.forEach((kind, index) => { if (!['image', 'video', 'model', 'environment'].includes(String(kind))) add(issues, `${path}.kinds[${index}]`, 'value', 'Unsupported asset kind.') })
	stringArray(value.delivery, `${path}.delivery`, 2, issues)
	if (Array.isArray(value.delivery)) value.delivery.forEach((delivery, index) => { if (!['astro-import', 'public-copy'].includes(String(delivery))) add(issues, `${path}.delivery[${index}]`, 'value', 'Unsupported asset delivery.') })
	if (value.altTextProp !== undefined) stringId(value.altTextProp, `${path}.altTextProp`, issues)
	if (value.decorativeProp !== undefined) stringId(value.decorativeProp, `${path}.decorativeProp`, issues)
}

const validateTypography = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (!isRecord(value)) return add(issues, path, 'type', 'typography must be an object.')
	knownKeys(value, ['fluidSize', 'variableAxes', 'textFit', 'maxLineLength', 'wrapping'], path, issues)
	for (const key of ['fluidSize', 'textFit', 'maxLineLength']) if (typeof value[key] !== 'boolean') add(issues, `${path}.${key}`, 'type', `${key} must be boolean.`)
	stringArray(value.wrapping, `${path}.wrapping`, 5, issues)
	if (Array.isArray(value.wrapping)) value.wrapping.forEach((entry, index) => {
		if (!['wrap', 'nowrap', 'balance', 'pretty', 'stable'].includes(String(entry))) add(issues, `${path}.wrapping[${index}]`, 'value', 'Unsupported text wrapping mode.')
	})
	array(value.variableAxes, `${path}.variableAxes`, 16, issues, (axis, axisPath) => {
		if (!isRecord(axis)) return add(issues, axisPath, 'type', 'Variable font axis must be an object.')
		knownKeys(axis, ['tag', 'label', 'min', 'max', 'step', 'default'], axisPath, issues)
		if (typeof axis.tag !== 'string' || !/^[A-Za-z0-9]{4}$/.test(axis.tag)) add(issues, `${axisPath}.tag`, 'value', 'Axis tag must contain four alphanumeric characters.')
		stringValue(axis.label, `${axisPath}.label`, issues)
		for (const key of ['min', 'max', 'step', 'default']) if (typeof axis[key] !== 'number' || !Number.isFinite(axis[key])) add(issues, `${axisPath}.${key}`, 'type', `${key} must be finite.`)
		if (typeof axis.min === 'number' && typeof axis.max === 'number' && axis.min >= axis.max) add(issues, axisPath, 'bounds', 'Axis min must be lower than max.')
		if (typeof axis.step === 'number' && axis.step <= 0) add(issues, `${axisPath}.step`, 'bounds', 'Axis step must be positive.')
		if (typeof axis.default === 'number' && typeof axis.min === 'number' && typeof axis.max === 'number' && (axis.default < axis.min || axis.default > axis.max)) add(issues, `${axisPath}.default`, 'bounds', 'Axis default must be within its range.')
	})
}

const validatePositioning = (
	value: unknown,
	path: string,
	issues: EditorManifestIssue[]
) => {
	if (!isRecord(value)) return add(issues, path, 'type', 'positioning must be an object.')
	knownKeys(value, ['editable', 'modes', 'offsets', 'responsive', 'zIndex'], path, issues)
	if (typeof value.editable !== 'boolean') add(issues, `${path}.editable`, 'type', 'editable must be boolean.')
	if (typeof value.responsive !== 'boolean') add(issues, `${path}.responsive`, 'type', 'responsive must be boolean.')
	stringArray(value.modes, `${path}.modes`, EDITOR_POSITION_MODES.length, issues)
	if (Array.isArray(value.modes)) {
		if (value.modes.length === 0) add(issues, `${path}.modes`, 'limit', 'At least one position mode is required.')
		value.modes.forEach((mode, index) => {
			if (typeof mode === 'string' && !positionModes.has(mode)) add(issues, `${path}.modes[${index}]`, 'position-mode', `Unsupported position mode: ${mode}.`)
		})
	}
	stringArray(value.offsets, `${path}.offsets`, EDITOR_POSITION_OFFSETS.length, issues)
	if (Array.isArray(value.offsets)) value.offsets.forEach((offset, index) => {
		if (typeof offset === 'string' && !positionOffsets.has(offset)) add(issues, `${path}.offsets[${index}]`, 'position-offset', `Unsupported logical offset: ${offset}.`)
	})
	if (value.editable === false && Array.isArray(value.offsets) && value.offsets.length > 0) add(issues, `${path}.offsets`, 'locked', 'Locked positioning cannot expose editable offsets.')
	if (!isRecord(value.zIndex)) return add(issues, `${path}.zIndex`, 'type', 'zIndex must be an object.')
	knownKeys(value.zIndex, ['editable', 'tokens', 'allowCustom', 'min', 'max'], `${path}.zIndex`, issues)
	if (typeof value.zIndex.editable !== 'boolean') add(issues, `${path}.zIndex.editable`, 'type', 'zIndex.editable must be boolean.')
	if (typeof value.zIndex.allowCustom !== 'boolean') add(issues, `${path}.zIndex.allowCustom`, 'type', 'zIndex.allowCustom must be boolean.')
	if (value.editable === false && value.zIndex.editable === true) add(issues, `${path}.zIndex.editable`, 'locked', 'Locked positioning cannot expose z-index editing.')
	stringArray(value.zIndex.tokens, `${path}.zIndex.tokens`, EDITOR_Z_INDEX_TOKENS.length, issues)
	if (Array.isArray(value.zIndex.tokens)) value.zIndex.tokens.forEach((token, index) => {
		if (typeof token === 'string' && !zIndexTokens.has(token)) add(issues, `${path}.zIndex.tokens[${index}]`, 'z-index-token', `Unsupported z-index token: ${token}.`)
	})
	if (value.zIndex.allowCustom === true) {
		if (!Number.isInteger(value.zIndex.min) || !Number.isInteger(value.zIndex.max)) add(issues, `${path}.zIndex`, 'bounds', 'Custom z-index requires integer min and max bounds.')
		else if ((value.zIndex.min as number) < -100 || (value.zIndex.max as number) > 10_000 || (value.zIndex.min as number) > (value.zIndex.max as number)) add(issues, `${path}.zIndex`, 'bounds', 'Custom z-index bounds must stay between -100 and 10000 and min must not exceed max.')
	} else if (value.zIndex.min !== undefined || value.zIndex.max !== undefined) add(issues, `${path}.zIndex`, 'bounds', 'Custom z-index bounds require allowCustom.')
}

const validateValueSchema = (
	value: unknown,
	path: string,
	issues: EditorManifestIssue[],
	depth: number
) => {
	if (!isRecord(value)) return add(issues, path, 'type', 'Value schema must be an object.')
	knownKeys(value, ['kind', 'values', 'min', 'max', 'step', 'pattern', 'item', 'fields'], path, issues)
	if (depth > 4) return add(issues, path, 'depth', 'Value schema is too deeply nested.')
	if (!['boolean', 'number', 'string', 'enum', 'array', 'object'].includes(String(value.kind))) add(issues, `${path}.kind`, 'value', 'Unsupported value schema kind.')
	if (value.kind === 'enum') stringArray(value.values, `${path}.values`, 128, issues)
	if (value.kind === 'array') validateValueSchema(value.item, `${path}.item`, issues, depth + 1)
	if (value.kind === 'object') {
		array(value.fields, `${path}.fields`, 64, issues, (item, itemPath) => {
			if (!isRecord(item)) return add(issues, itemPath, 'type', 'Field must be an object.')
			knownKeys(item, ['id', 'label', 'required', 'schema'], itemPath, issues)
			stringId(item.id, `${itemPath}.id`, issues)
			stringValue(item.label, `${itemPath}.label`, issues)
			validateValueSchema(item.schema, `${itemPath}.schema`, issues, depth + 1)
		})
		uniqueIds(value.fields, `${path}.fields`, issues)
	}
}

const inspectJson = (
	value: unknown,
	path: string,
	depth: number,
	seen: WeakSet<object>,
	issues: EditorManifestIssue[]
) => {
	if (issues.length >= EDITOR_MANIFEST_LIMITS.issues) return
	if (depth > EDITOR_MANIFEST_LIMITS.depth) return add(issues, path, 'depth', 'Manifest nesting is too deep.')
	if (value === null || typeof value === 'boolean') return
	if (typeof value === 'string' && value.length > EDITOR_MANIFEST_LIMITS.stringLength) add(issues, path, 'length', 'String is too long.')
	if (typeof value === 'string') return
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) add(issues, path, 'json-type', 'Numbers must be finite.')
		return
	}
	if (!value || typeof value !== 'object') return add(issues, path, 'json-type', 'Manifest values must be JSON-safe.')
	if (seen.has(value)) return add(issues, path, 'cycle', 'Manifest must not contain cycles.')
	seen.add(value)
	if (Array.isArray(value) && Object.keys(value).length !== value.length) add(issues, path, 'sparse-array', 'Sparse arrays are not allowed.')
	if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) add(issues, path, 'prototype', 'Manifest objects must be plain objects.')
	for (const [key, child] of Object.entries(value)) {
		if (unsafeKeys.has(key)) add(issues, `${path}.${key}`, 'unsafe-key', `Unsafe key: ${key}.`)
		inspectJson(child, `${path}.${key}`, depth + 1, seen, issues)
	}
	seen.delete(value)
}

const validateCssValue = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (typeof value === 'number') return
	if (typeof value !== 'string' || value.length === 0) return add(issues, path, 'type', 'CSS value must be a string or number.')
	if (/[{};]/.test(value) || /url\s*\(|@import|javascript:|expression\s*\(|-moz-binding|behavior\s*:/i.test(value)) add(issues, path, 'unsafe-css', 'CSS value contains a forbidden construct.')
}

const array = (
	value: unknown,
	path: string,
	limit: number,
	issues: EditorManifestIssue[],
	visit: (item: unknown, path: string) => void
) => {
	if (!Array.isArray(value)) return add(issues, path, 'type', 'Expected an array.')
	if (value.length > limit) add(issues, path, 'limit', `Array exceeds limit ${limit}.`)
	value.slice(0, limit).forEach((item, index) => visit(item, `${path}[${index}]`))
}

const stringArray = (
	value: unknown,
	path: string,
	limit: number,
	issues: EditorManifestIssue[]
) => {
	array(value, path, limit, issues, (item, itemPath) => stringValue(item, itemPath, issues))
	if (!Array.isArray(value)) return
	const seen = new Set<string>()
	value.forEach((item, index) => {
		if (typeof item !== 'string') return
		if (seen.has(item)) add(issues, `${path}[${index}]`, 'duplicate', `Duplicate value: ${item}.`)
		seen.add(item)
	})
}

const uniqueIds = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (!Array.isArray(value)) return
	const seen = new Set<string>()
	value.forEach((item, index) => {
		if (!isRecord(item) || typeof item.id !== 'string') return
		if (seen.has(item.id)) add(issues, `${path}[${index}].id`, 'duplicate', `Duplicate id: ${item.id}.`)
		seen.add(item.id)
	})
}

const stringId = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (typeof value !== 'string' || !safeId.test(value)) add(issues, path, 'id', 'Expected a lowercase editor identifier.')
}
const stringValue = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (typeof value !== 'string' || value.trim().length === 0) add(issues, path, 'string', 'Expected a non-empty string.')
}
const packageValue = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (typeof value !== 'string' || !packageSpecifier.test(value)) add(issues, path, 'package', 'Expected a package import specifier.')
}
const pathValue = (value: unknown, path: string, issues: EditorManifestIssue[]) => {
	if (typeof value !== 'string' || !relativePath.test(value)) add(issues, path, 'path', 'Expected a contained relative path.')
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const add = (issues: EditorManifestIssue[], path: string, code: string, message: string) => {
	if (issues.length < EDITOR_MANIFEST_LIMITS.issues) issues.push({path, code, message})
}

const knownKeys = (
	value: Record<string, unknown>,
	allowed: readonly string[],
	path: string,
	issues: EditorManifestIssue[]
) => {
	const allowedKeys = new Set(allowed)
	for (const key of Object.keys(value)) {
		if (!allowedKeys.has(key)) {
			add(issues, `${path}.${key}`, 'unknown', `Unknown property: ${key}.`)
		}
	}
}

const cloneJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value))
const deepFreeze = <Value>(value: Value): Value => {
	if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
	for (const child of Object.values(value)) deepFreeze(child)
	return Object.freeze(value)
}
