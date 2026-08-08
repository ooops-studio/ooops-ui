import {readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

import {
	parseComponentManifest,
	parseDesignTokenManifest,
	parseEditorExtensionManifest,
	parseInteractiveSceneManifest,
	parseTemplateComponentRegistry,
	validateComponentManifest,
	validateEditorExtensionManifest,
	validateInteractiveSceneManifest
} from '../src/index'

const component = {
	schemaVersion: 2,
	id: 'input',
	label: 'Input',
	category: 'forms',
	owner: '@ooopsstudio/ui-primitives',
	insertable: true,
	adapters: {astro: '@ooopsstudio/ui-astro/Input.astro'},
	props: [{id: 'label', label: 'Label', schema: {kind: 'string'}, editable: true, control: 'text'}],
	slots: [],
	events: [],
	parts: [{
		id: 'control',
		selector: "[data-part='control']",
		states: ['focus'],
		forceableStates: [],
		styleProperties: ['color'],
		responsive: true,
		positioning: {
			editable: true,
			modes: ['static', 'relative'],
			offsets: ['inset-block-start'],
			responsive: true,
			zIndex: {editable: true, tokens: ['z-index-base', 'z-index-raised'], allowCustom: false}
		},
		typography: {fluidSize: true, variableAxes: [{tag: 'wght', label: 'Weight', min: 100, max: 900, step: 1, default: 400}], textFit: true, maxLineLength: true, wrapping: ['wrap', 'balance', 'pretty']}
	}],
	variants: []
}

const scene = {
	schemaVersion: 2,
	id: 'reference-scene',
	label: 'Reference scene',
	category: 'interactive',
	owner: '@ooopsstudio/scene-three',
	insertable: true,
	internals: 'locked',
	adapters: {
		astro: '@ooopsstudio/scene-astro/InteractiveScene.astro',
		runtime: '@ooopsstudio/scene-three'
	},
	backend: 'auto',
	controls: [{
		id: 'intensity',
		label: 'Intensity',
		schema: {kind: 'number', min: 0, max: 1, step: 0.1},
		default: 0.5,
		editable: true,
		control: 'number'
	}],
	assets: [{
		id: 'model',
		label: 'Model',
		kind: 'model',
		source: 'public/assets/scenes/reference.glb',
		required: true
	}],
	inputs: ['pointer', 'velocity', 'time', 'viewport'],
	quality: {default: 'auto', allowed: ['low', 'auto', 'high']},
	fallbacks: {
		poster: 'public/assets/scenes/reference-poster.webp',
		description: 'An abstract shape responds to pointer movement.',
		reducedMotion: 'poster',
		contextLoss: 'poster'
	}
}

const extension = {
	schemaVersion: 2,
	id: 'reference-effect',
	label: 'Reference effect',
	category: 'scene',
	owner: 'ooops-astro-template',
	targetComponents: ['reference-scene'],
	tab: {id: 'effect', label: 'Effect', order: 50},
	controls: [{
		id: 'intensity', label: 'Intensity', group: 'motion', editable: true,
		control: 'range', schema: {kind: 'number', min: 0, max: 1, step: 0.1}, default: 0.5,
		binding: {kind: 'prop', prop: 'intensity'}
	}]
}

describe('@ooopsstudio/editor-contracts', () => {
	it('ships strict v2 JSON schemas for every public manifest family', () => {
		for (const name of ['component', 'accessibility', 'template', 'design-tokens', 'scene', 'extension']) {
			const schema = JSON.parse(readFileSync(new URL(`../schemas/${name}.json`, import.meta.url), 'utf8'))
			expect(schema.additionalProperties, name).toBe(false)
			expect(schema.properties.schemaVersion.const, name).toBe(2)
		}
	})
	it('parses, clones and deeply freezes valid manifests', () => {
		const result = parseComponentManifest(component)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.value).not.toBe(component)
		expect(Object.isFrozen(result.value)).toBe(true)
		expect(Object.isFrozen(result.value.parts)).toBe(true)
	})

	it('rejects duplicate ids, unsafe styles, prototypes and cycles deterministically', () => {
		const cyclic: Record<string, unknown> = {
			...component,
			parts: [component.parts[0], component.parts[0]]
		}
		cyclic.self = cyclic
		const result = parseComponentManifest(cyclic)
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['cycle', 'duplicate']))
		expect(result.issues.length).toBeLessThanOrEqual(50)
	})

	it('rejects unknown schema versions and unsupported CSS properties', () => {
		expect(validateComponentManifest({...component, schemaVersion: 1})).toBe(false)
		expect(validateComponentManifest({
			...component,
			parts: [{...component.parts[0], styleProperties: ['position']}]
		})).toBe(false)
	})

	it('validates bounded controlled positioning and semantic z-index tokens', () => {
		expect(validateComponentManifest(component)).toBe(true)
		expect(validateComponentManifest({
			...component,
			parts: [{...component.parts[0], positioning: {...component.parts[0].positioning, modes: ['teleport']}}]
		})).toBe(false)
		expect(validateComponentManifest({
			...component,
			parts: [{
				...component.parts[0],
				positioning: {
					...component.parts[0].positioning,
					zIndex: {editable: true, tokens: ['z-index-raised'], allowCustom: true, min: -101, max: 10001}
				}
			}]
		})).toBe(false)
	})

	it('accepts the controlled media and effects style surface', () => {
		expect(validateComponentManifest({
			...component,
			parts: [{
				...component.parts[0],
				styleProperties: [
					'transform',
					'filter',
					'aspect-ratio',
					'object-fit',
					'object-position'
				]
			}]
		})).toBe(true)
	})

	it('accepts the specialized layout and appearance style surface', () => {
		expect(validateComponentManifest({
			...component,
			parts: [{
				...component.parts[0],
				styleProperties: [
					'flex-basis', 'flex-grow', 'flex-shrink', 'order', 'align-self',
					'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
					'grid-column', 'grid-row', 'overflow', 'clip-path',
					'margin-block-start', 'margin-inline-end',
					'padding-block-end', 'padding-inline-start',
					'background-image', 'background-position', 'background-size',
					'background-repeat', 'border-style', 'box-shadow'
				]
			}]
		})).toBe(true)
	})

	it('validates forceable states and structured typography capabilities', () => {
		expect(validateComponentManifest({...component, parts: [{...component.parts[0], states: ['focus-visible'], forceableStates: ['focus-visible']}]})).toBe(true)
		expect(validateComponentManifest({...component, parts: [{...component.parts[0], forceableStates: ['open']}]})).toBe(false)
		expect(validateComponentManifest({...component, parts: [{...component.parts[0], typography: {...component.parts[0].typography, variableAxes: [{tag: 'weight', label: 'Weight', min: 100, max: 900, step: 1, default: 400}]}}]})).toBe(false)
	})

	it('parses bounded custom editor extensions without executable modules', () => {
		const withAsset = {
			...extension,
			controls: [...extension.controls, {
				id: 'model', label: 'Model', group: 'assets', editable: true, control: 'asset',
				schema: {kind: 'string'}, asset: {kinds: ['model'], delivery: ['public-copy']},
				binding: {kind: 'prop', prop: 'model'}
			}]
		}
		const parsed = parseEditorExtensionManifest(withAsset)
		expect(parsed.ok).toBe(true)
		if (parsed.ok) expect(Object.isFrozen(parsed.value.controls[0]?.binding)).toBe(true)
		expect(validateEditorExtensionManifest({...extension, runtime: './execute.js'})).toBe(false)
		expect(validateEditorExtensionManifest({...extension, controls: [{...extension.controls[0], binding: {kind: 'style', part: 'root', property: 'content'}}]})).toBe(false)
		expect(validateEditorExtensionManifest({...extension, controls: [{...extension.controls[0], control: 'asset'}]})).toBe(false)
		expect(validateEditorExtensionManifest({...withAsset, controls: [{...withAsset.controls[1], binding: {kind: 'style', part: 'root', property: 'color'}}]})).toBe(false)
	})

	it('accepts image, video, model and environment controls with explicit delivery ownership', () => {
		for (const kind of ['image', 'video', 'model', 'environment'] as const) {
			const control = {
				id: `${kind}-asset`, label: `${kind} asset`, group: 'assets', editable: true, control: 'asset' as const,
				schema: {kind: 'string' as const}, asset: {kinds: [kind], delivery: kind === 'image' ? ['astro-import', 'public-copy'] as const : ['public-copy'] as const},
				binding: {kind: 'prop' as const, prop: `${kind}Source`}
			}
			expect(validateEditorExtensionManifest({...extension, controls: [control]})).toBe(true)
		}
	})

	it('accepts bounded asset import metadata', () => {
		expect(validateComponentManifest({
			...component,
			props: [{...component.props[0], control: 'asset', asset: {kinds: ['image'], delivery: ['astro-import', 'public-copy'], altTextProp: 'alt'}}]
		})).toBe(true)
	})

	it('keeps locked runtime positioning immutable', () => {
		expect(validateComponentManifest({
			...component,
			parts: [{
				...component.parts[0],
				positioning: {
					editable: false,
					modes: ['fixed'],
					offsets: ['inset-block-start'],
					responsive: false,
					zIndex: {editable: true, tokens: ['z-index-modal'], allowCustom: false}
				}
			}]
		})).toBe(false)
	})

	it('validates inline template manifests and rejects unknown keys', () => {
		const valid = parseTemplateComponentRegistry({
			schemaVersion: 2,
			manifests: [component],
			components: [{
				id: 'input',
				source: 'src/Input.astro',
				manifest: 'editor/components.json',
				manifestId: 'input',
				behavior: 'template',
				styleSources: ['src/input.css'],
				insertion: {name: 'Input', exportName: 'default', defaultProps: {label: 'Label'}}
			}],
			bindings: [],
			regions: [{
				id: 'main-content',
				routeId: 'home',
				source: 'src/pages/index.astro',
				editorId: 'home-main',
				slot: 'default',
				allowedComponents: ['input'],
				min: 0,
				max: 12
			}]
		})
		expect(valid.ok).toBe(true)
		if (valid.ok) {
			expect(Object.isFrozen(valid.value.regions?.[0])).toBe(true)
		}
		expect(parseComponentManifest({...component, surprise: true})).toMatchObject({ok: false})
	})

	it('rejects unsafe source ownership and unknown region components', () => {
		expect(parseTemplateComponentRegistry({
			schemaVersion: 2,
			manifests: [component],
			components: [{
				id: 'input',
				source: 'src/Input.astro',
				manifest: 'editor/components.json',
				manifestId: 'input',
				behavior: 'template',
				styleSources: ['../outside.css']
			}],
			bindings: [],
			regions: [{
				id: 'main', routeId: 'home', source: 'src/pages/index.astro', editorId: 'main',
				slot: 'default', allowedComponents: ['unknown'], min: 0, max: 1
			}]
		})).toMatchObject({ok: false})
	})

	it('parses strict scene manifests and freezes nested controls and assets', () => {
		const result = parseInteractiveSceneManifest(scene)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(Object.isFrozen(result.value)).toBe(true)
		expect(Object.isFrozen(result.value.controls[0]?.schema)).toBe(true)
		expect(Object.isFrozen(result.value.assets)).toBe(true)
	})

	it('rejects unsafe assets, unsupported inputs, unlocked internals and invalid quality', () => {
		expect(validateInteractiveSceneManifest({...scene, internals: 'editable'})).toBe(false)
		expect(validateInteractiveSceneManifest({
			...scene,
			assets: [{...scene.assets[0], source: 'https://example.com/model.glb'}]
		})).toBe(false)
		expect(validateInteractiveSceneManifest({
			...scene,
			assets: [{...scene.assets[0], source: 'public/assets/model.mov'}]
		})).toBe(false)
		expect(validateInteractiveSceneManifest({...scene, inputs: ['camera']})).toBe(false)
		expect(validateInteractiveSceneManifest({
			...scene,
			quality: {default: 'high', allowed: ['low', 'auto']}
		})).toBe(false)
	})

	it('accepts bounded scene references and rejects duplicate registry scene ids', () => {
		expect(parseTemplateComponentRegistry({
			schemaVersion: 2,
			manifests: [],
			components: [],
			bindings: [],
			scenes: [{
				id: 'reference-scene',
				source: 'src/scenes/reference.ts',
				manifest: 'editor/scenes/reference.json',
				manifestId: 'reference-scene',
				behavior: 'template'
			}]
		})).toMatchObject({ok: true})
		expect(parseTemplateComponentRegistry({
			schemaVersion: 2,
			manifests: [],
			components: [],
			bindings: [],
			scenes: [
				{
					id: 'scene',
					source: 'src/a.ts',
					manifest: 'editor/a.json',
					manifestId: 'scene',
					behavior: 'template'
				},
				{
					id: 'scene',
					source: 'src/b.ts',
					manifest: 'editor/b.json',
					manifestId: 'scene',
					behavior: 'template'
				}
			]
		})).toMatchObject({ok: false})
	})

	it('rejects executable token values', () => {
		const result = parseDesignTokenManifest({
			schemaVersion: 2,
			id: 'site',
			themes: [{id: 'light', mode: 'light'}],
			tokens: [{id: 'background', cssVariable: '--color-bg', label: 'Background', category: 'color', type: 'color', value: 'url(https://example.com/x)', editable: true}]
		})
		expect(result.ok).toBe(false)
	})

	it('requires integer values for layer tokens', () => {
		expect(parseDesignTokenManifest({
			schemaVersion: 2,
			id: 'site',
			themes: [{id: 'light', mode: 'light'}],
			tokens: [{id: 'z-index-modal', cssVariable: '--z-index-modal', label: 'Modal', category: 'layer', type: 'integer', value: 1200, editable: false}]
		})).toMatchObject({ok: true})
		expect(parseDesignTokenManifest({
			schemaVersion: 2,
			id: 'site',
			themes: [{id: 'light', mode: 'light'}],
			tokens: [{id: 'z-index-modal', cssVariable: '--z-index-modal', label: 'Modal', category: 'layer', type: 'integer', value: 12.5, editable: false}]
		})).toMatchObject({ok: false})
	})

	it('rejects non-JSON values and sparse collections before cloning', () => {
		expect(parseComponentManifest({...component, props: [{...component.props[0], default: () => 'unsafe'}]})).toMatchObject({ok: false})
		const sparse = Array(2)
		sparse[1] = component.parts[0]
		expect(parseComponentManifest({...component, parts: sparse})).toMatchObject({ok: false})
	})
})
