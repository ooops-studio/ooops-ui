import {
	EDITOR_SCHEMA_VERSION,
	type EditorComponentManifest,
	type TemplateSceneReference
} from '@ooopsstudio/editor-contracts'

const rootPositioning = {
	editable: true,
	modes: ['static', 'relative', 'absolute', 'sticky', 'fixed'],
	offsets: ['inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end'],
	responsive: true,
	zIndex: {
		editable: true,
		tokens: [
			'z-index-base', 'z-index-raised', 'z-index-sticky', 'z-index-dropdown',
			'z-index-overlay', 'z-index-modal', 'z-index-toast'
		],
		allowCustom: false
	}
} as const

const lockedPositioning = {
	editable: false,
	modes: ['absolute'],
	offsets: [],
	responsive: false,
	zIndex: {editable: false, tokens: [], allowCustom: false}
} as const

export const interactiveSceneComponentManifest = Object.freeze({
	schemaVersion: EDITOR_SCHEMA_VERSION,
	id: 'interactive-scene',
	label: 'Interactive scene',
	category: 'media',
	owner: '@ooopsstudio/scene-astro',
	insertable: true,
	adapters: {
		astro: '@ooopsstudio/scene-astro/InteractiveScene.astro',
		controller: '@ooopsstudio/scene-astro/runtime'
	},
	props: [
		{id: 'scene', label: 'Scene', schema: {kind: 'string'}, required: true, editable: true, control: 'select'},
		{id: 'quality', label: 'Quality', schema: {kind: 'enum', values: ['low', 'auto', 'high']}, default: 'auto', editable: true, control: 'enum'},
		{id: 'poster', label: 'Poster', schema: {kind: 'string'}, required: true, editable: true, control: 'text'},
		{id: 'description', label: 'Description', schema: {kind: 'string'}, editable: true, control: 'text'},
		{id: 'decorative', label: 'Decorative', schema: {kind: 'boolean'}, default: false, editable: true, control: 'boolean'},
		{id: 'aspectRatio', label: 'Aspect ratio', schema: {kind: 'string'}, default: '16 / 9', editable: true, control: 'text'}
	],
	slots: [{id: 'fallback', label: 'Fallback', min: 0, max: 1, editable: true}],
	events: [{
		id: 'state-change',
		label: 'State change',
		detail: {kind: 'object', fields: [
			{id: 'status', label: 'Status', schema: {kind: 'string'}},
			{id: 'backend', label: 'Backend', schema: {kind: 'string'}}
		]}
	}],
	parts: [
		{
			id: 'root',
			selector: "[data-part='root']",
			states: ['idle', 'mounting', 'running', 'paused', 'fallback'],
			styleProperties: ['background-color', 'border-radius', 'height', 'width'],
			responsive: true,
			positioning: rootPositioning
		},
		{
			id: 'canvas',
			selector: "[data-part='canvas']",
			states: ['running', 'paused', 'fallback'],
			styleProperties: ['height', 'opacity', 'width'],
			responsive: true,
			positioning: lockedPositioning
		}
	],
	variants: ['meaningful', 'decorative']
} satisfies EditorComponentManifest)

export const createTemplateSceneReference = (
	reference: TemplateSceneReference
): Readonly<TemplateSceneReference> => Object.freeze({...reference})
