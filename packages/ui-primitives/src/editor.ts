import {
	parseComponentManifest,
	validateComponentManifest,
	EDITOR_FORCEABLE_STATES,
	EDITOR_POSITION_OFFSETS,
	EDITOR_Z_INDEX_TOKENS,
	type EditorComponentManifest,
	type EditorEventManifest,
	type EditorForceableState,
	type EditorPartManifest,
	type EditorPositioningCapability,
	type EditorPropManifest,
	type EditorSlotManifest,
	type EditorStyleProperty,
	type EditorValueField,
	type EditorValueSchema
} from '@ooopsstudio/editor-contracts'

export type UiComponentManifest = EditorComponentManifest
export type UiComponentPropDefinition = EditorPropManifest
export type UiComponentPartDefinition = EditorPartManifest
export type UiComponentSlotDefinition = EditorSlotManifest
export type UiComponentEventDefinition = EditorEventManifest

const stringSchema = (options: Partial<EditorValueSchema> = {}): EditorValueSchema => ({kind: 'string', ...options})
const numberSchema = (options: Partial<EditorValueSchema> = {}): EditorValueSchema => ({kind: 'number', ...options})
const booleanSchema: EditorValueSchema = {kind: 'boolean'}
const enumSchema = (...values: string[]): EditorValueSchema => ({kind: 'enum', values})
const stringArraySchema: EditorValueSchema = {kind: 'array', item: {kind: 'string'}}
const collectionSchema = (fields: EditorValueField[]): EditorValueSchema => ({kind: 'array', item: {kind: 'object', fields}})

const prop = (
	id: string,
	label: string,
	schema: EditorValueSchema,
	options: Partial<Omit<EditorPropManifest, 'id' | 'label' | 'schema' | 'editable'>> & {editable?: boolean} = {}
): EditorPropManifest => ({id, label, schema, editable: options.editable ?? true, ...options})

const commonProps = [
	prop('id', 'ID', stringSchema({pattern: '^[A-Za-z][A-Za-z0-9_-]*$'}), {required: true, editable: false}),
	prop('disabled', 'Disabled', booleanSchema, {default: false, control: 'boolean'}),
	prop('class', 'CSS class', stringSchema(), {editable: false})
]

const choiceFields: EditorValueField[] = [
	{id: 'value', label: 'Value', required: true, schema: stringSchema()},
	{id: 'label', label: 'Label', required: true, schema: stringSchema()},
	{id: 'description', label: 'Description', schema: stringSchema()},
	{id: 'group', label: 'Group', schema: stringSchema()},
	{id: 'disabled', label: 'Disabled', schema: booleanSchema}
]

const menuFields: EditorValueField[] = [
	{id: 'id', label: 'ID', required: true, schema: stringSchema()},
	{id: 'type', label: 'Type', required: true, schema: enumSchema('item', 'link', 'checkbox', 'radio', 'separator')},
	{id: 'label', label: 'Label', schema: stringSchema()},
	{id: 'href', label: 'Link', schema: stringSchema()},
	{id: 'value', label: 'Value', schema: stringSchema()},
	{id: 'checked', label: 'Checked', schema: booleanSchema},
	{id: 'disabled', label: 'Disabled', schema: booleanSchema}
]

const propsById: Record<string, EditorPropManifest[]> = {
	field: [
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('hint', 'Hint', stringSchema(), {control: 'text'}),
		prop('error', 'Error', stringSchema(), {control: 'text'}),
		prop('required', 'Required', booleanSchema, {default: false, control: 'boolean'}),
		prop('pending', 'Pending', booleanSchema, {default: false, control: 'boolean'})
	],
	input: [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('type', 'Type', enumSchema('text', 'email', 'url', 'tel', 'password', 'search', 'number', 'date', 'datetime-local', 'time', 'color'), {default: 'text', control: 'enum'}),
		prop('value', 'Value', stringSchema(), {control: 'text'}),
		prop('defaultValue', 'Default value', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('hint', 'Hint', stringSchema(), {control: 'text'}),
		prop('error', 'Error', stringSchema(), {control: 'text'}),
		prop('placeholder', 'Placeholder', stringSchema(), {control: 'text'}),
		prop('required', 'Required', booleanSchema, {default: false, control: 'boolean'}),
		prop('readonly', 'Read only', booleanSchema, {default: false, control: 'boolean'}),
		prop('clearable', 'Clear button', booleanSchema, {default: false, control: 'boolean'}),
		prop('revealable', 'Password reveal', booleanSchema, {default: false, control: 'boolean'}),
		prop('autocomplete', 'Autocomplete', stringSchema(), {control: 'text'})
	],
	textarea: [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('value', 'Value', stringSchema(), {control: 'text'}),
		prop('defaultValue', 'Default value', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('hint', 'Hint', stringSchema(), {control: 'text'}),
		prop('error', 'Error', stringSchema(), {control: 'text'}),
		prop('placeholder', 'Placeholder', stringSchema(), {control: 'text'}),
		prop('rows', 'Rows', numberSchema({min: 1, max: 40, step: 1}), {default: 4, control: 'number'}),
		prop('maxlength', 'Maximum characters', numberSchema({min: 1, step: 1}), {control: 'number'}),
		prop('required', 'Required', booleanSchema, {default: false, control: 'boolean'}),
		prop('readonly', 'Read only', booleanSchema, {default: false, control: 'boolean'}),
		prop('autoResize', 'Auto resize', booleanSchema, {default: false, control: 'boolean'}),
		prop('showCount', 'Character count', booleanSchema, {default: false, control: 'boolean'})
	],
	checkbox: [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('value', 'Value', stringSchema(), {default: 'on', control: 'text'}),
		prop('label', 'Label', stringSchema(), {required: true, control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('error', 'Error', stringSchema(), {control: 'text'}),
		prop('checked', 'Checked', booleanSchema, {default: false, control: 'boolean'}),
		prop('indeterminate', 'Indeterminate', booleanSchema, {default: false, control: 'boolean'}),
		prop('required', 'Required', booleanSchema, {default: false, control: 'boolean'})
	],
	'radio-group': choiceProps('vertical'),
	switch: [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {required: true, control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('checked', 'Checked', booleanSchema, {default: false, control: 'boolean'})
	],
	combobox: selectProps(true),
	'multi-select': [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('values', 'Values', stringArraySchema),
		prop('options', 'Options', collectionSchema(choiceFields), {required: true}),
		prop('placeholder', 'Placeholder', stringSchema(), {default: 'Search options', control: 'text'}),
		prop('maxSelected', 'Maximum selections', numberSchema({min: 1, step: 1}), {control: 'number'}),
		prop('showSelectAll', 'Show select all', booleanSchema, {default: true, control: 'boolean'}),
		prop('showClear', 'Show clear', booleanSchema, {default: true, control: 'boolean'})
	],
	'dropdown-menu': [
		prop('triggerLabel', 'Trigger label', stringSchema(), {default: 'Menu', control: 'text'}),
		prop('ariaLabel', 'Accessible label', stringSchema(), {default: 'Menu', control: 'text'}),
		prop('items', 'Items', collectionSchema(menuFields)),
		prop('open', 'Open', booleanSchema, {default: false, control: 'boolean'}),
		prop('loop', 'Loop keyboard navigation', booleanSchema, {default: true, control: 'boolean'}),
		prop('portal', 'Use portal', booleanSchema, {default: true, editable: false})
	],
	tooltip: [
		prop('label', 'Tooltip text', stringSchema(), {required: true, control: 'text'}),
		prop('openDelayMs', 'Open delay', numberSchema({min: 0, max: 5000, step: 10}), {default: 500, control: 'number'}),
		prop('closeDelayMs', 'Close delay', numberSchema({min: 0, max: 5000, step: 10}), {default: 80, control: 'number'}),
		prop('touch', 'Touch behavior', enumSchema('disabled', 'longpress'), {default: 'disabled', control: 'enum'}),
		prop('portal', 'Use portal', booleanSchema, {default: true, editable: false})
	],
	tabs: navigationProps('tabs'),
	accordion: navigationProps('accordion'),
	slider: [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('min', 'Minimum', numberSchema(), {default: 0, control: 'number'}),
		prop('max', 'Maximum', numberSchema(), {default: 100, control: 'number'}),
		prop('step', 'Step', numberSchema({min: 0.000001}), {default: 1, control: 'number'}),
		prop('orientation', 'Orientation', enumSchema('horizontal', 'vertical'), {default: 'horizontal', control: 'enum'}),
		prop('direction', 'Direction', enumSchema('ltr', 'rtl'), {default: 'ltr', control: 'enum'}),
		prop('minStepsBetweenThumbs', 'Thumb gap', numberSchema({min: 0, step: 1}), {default: 0, control: 'number'})
	],
	'number-input': [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('value', 'Value', numberSchema(), {control: 'number'}),
		prop('min', 'Minimum', numberSchema(), {control: 'number'}),
		prop('max', 'Maximum', numberSchema(), {control: 'number'}),
		prop('step', 'Step', numberSchema({min: 0.000001}), {default: 1, control: 'number'}),
		prop('clampOnBlur', 'Clamp on blur', booleanSchema, {default: true, control: 'boolean'}),
		prop('required', 'Required', booleanSchema, {default: false, control: 'boolean'})
	],
	'segmented-control': choiceProps('horizontal'),
	select: selectProps(false),
	dialog: dialogProps(false),
	modal: dialogProps(true),
	popover: [
		prop('triggerLabel', 'Trigger label', stringSchema(), {default: 'Open', control: 'text'}),
		prop('open', 'Open', booleanSchema, {default: false, control: 'boolean'}),
		prop('placement', 'Placement', enumSchema('top', 'bottom', 'left', 'right'), {default: 'bottom', control: 'enum'}),
		prop('align', 'Alignment', enumSchema('start', 'center', 'end'), {default: 'start', control: 'enum'}),
		prop('role', 'Role', enumSchema('dialog', 'region', 'menu', 'listbox'), {default: 'dialog', control: 'enum'}),
		prop('ariaLabel', 'Accessible label', stringSchema(), {default: 'Popover', control: 'text'}),
		prop('closeOnOutside', 'Close outside', booleanSchema, {default: true, control: 'boolean'}),
		prop('closeOnEscape', 'Close on Escape', booleanSchema, {default: true, control: 'boolean'}),
		prop('focusOnOpen', 'Focus on open', booleanSchema, {default: false, control: 'boolean'}),
		prop('trapFocus', 'Trap focus', booleanSchema, {default: false, control: 'boolean'}),
		prop('portal', 'Use portal', booleanSchema, {default: true, editable: false})
	],
	part: [
		prop('part', 'Part', stringSchema(), {required: true, editable: false}),
		prop('as', 'Element', stringSchema(), {editable: false}),
		prop('state', 'State', stringSchema(), {editable: false}),
		prop('orientation', 'Orientation', enumSchema('horizontal', 'vertical'), {editable: false})
	]
}

function choiceProps(defaultOrientation: 'horizontal' | 'vertical') {
	return [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('value', 'Value', stringSchema(), {control: 'text'}),
		prop('options', 'Options', collectionSchema(choiceFields), {required: true}),
		prop('orientation', 'Orientation', enumSchema('horizontal', 'vertical'), {default: defaultOrientation, control: 'enum'})
	]
}

function selectProps(combobox: boolean) {
	return [
		prop('name', 'Name', stringSchema(), {control: 'text'}),
		prop('label', 'Label', stringSchema(), {control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('error', 'Error', stringSchema(), {control: 'text'}),
		prop('value', 'Value', stringSchema(), {control: 'text'}),
		prop('options', 'Options', collectionSchema(choiceFields), {required: true}),
		prop('placeholder', 'Placeholder', stringSchema(), {control: 'text'}),
		...(combobox ? [
			prop('allowCustomValue', 'Allow custom value', booleanSchema, {default: false, control: 'boolean'}),
			prop('clearable', 'Clear button', booleanSchema, {default: true, control: 'boolean'})
		] : [prop('allowEmpty', 'Allow empty value', booleanSchema, {default: false, control: 'boolean'})]),
		prop('required', 'Required', booleanSchema, {default: false, control: 'boolean'}),
		prop('portal', 'Use portal', booleanSchema, {default: true, editable: false})
	]
}

function navigationProps(kind: 'tabs' | 'accordion') {
	const itemFields: EditorValueField[] = [
		{id: 'id', label: 'ID', required: true, schema: stringSchema()},
		{id: 'label', label: 'Label', required: true, schema: stringSchema()},
		{id: 'disabled', label: 'Disabled', schema: booleanSchema},
		{id: 'href', label: 'Link', schema: stringSchema()}
	]
	return kind === 'tabs' ? [
		prop('items', 'Tabs', collectionSchema(itemFields), {required: true}),
		prop('activeId', 'Active tab', stringSchema(), {control: 'text'}),
		prop('mode', 'Mode', enumSchema('panels', 'navigation'), {default: 'panels', control: 'enum'}),
		prop('activation', 'Activation', enumSchema('automatic', 'manual'), {default: 'automatic', control: 'enum'}),
		prop('orientation', 'Orientation', enumSchema('horizontal', 'vertical'), {default: 'horizontal', control: 'enum'}),
		prop('loop', 'Loop keyboard navigation', booleanSchema, {default: true, control: 'boolean'})
	] : [
		prop('items', 'Items', collectionSchema(itemFields), {required: true}),
		prop('openIds', 'Open items', stringArraySchema),
		prop('type', 'Mode', enumSchema('single', 'multiple'), {default: 'single', control: 'enum'}),
		prop('collapsible', 'Collapsible', booleanSchema, {default: true, control: 'boolean'}),
		prop('headingLevel', 'Heading level', numberSchema({min: 2, max: 6, step: 1}), {default: 3, control: 'number'})
	]
}

function dialogProps(modal: boolean) {
	return [
		prop('title', 'Title', stringSchema(), {required: !modal, control: 'text'}),
		prop('description', 'Description', stringSchema(), {control: 'text'}),
		prop('triggerLabel', 'Trigger label', stringSchema(), {control: 'text'}),
		prop('open', 'Open', booleanSchema, {default: false, control: 'boolean'}),
		prop('closeOnBackdrop', 'Close on backdrop', booleanSchema, {default: true, control: 'boolean'}),
		prop('closeOnEscape', 'Close on Escape', booleanSchema, {default: true, control: 'boolean'}),
		...(modal ? [
			prop('ariaLabel', 'Accessible label', stringSchema(), {default: 'Dialog', control: 'text'}),
			prop('size', 'Size', enumSchema('sm', 'md', 'lg', 'xl'), {default: 'md', control: 'enum'}),
			prop('showCloseButton', 'Show close button', booleanSchema, {default: true, control: 'boolean'})
		] : [
			prop('confirmLabel', 'Confirm label', stringSchema(), {default: 'Confirm', control: 'text'}),
			prop('cancelLabel', 'Cancel label', stringSchema(), {default: 'Cancel', control: 'text'}),
			prop('tone', 'Tone', enumSchema('primary', 'danger'), {default: 'primary', control: 'enum'}),
			prop('busy', 'Busy', booleanSchema, {default: false, control: 'boolean'})
		])
	]
}

const surfaceStyles: EditorStyleProperty[] = [
	'background-color', 'border-color', 'border-radius', 'border-style', 'border-width', 'box-shadow',
	'color', 'display', 'gap', 'height', 'margin', 'max-height', 'max-width', 'min-height', 'min-width',
	'opacity', 'padding', 'width', 'align-items', 'justify-content', 'flex-direction', 'flex-wrap',
	'grid-template-columns', 'grid-template-rows'
]
const textStyles: EditorStyleProperty[] = [
	'color', 'font-family', 'font-size', 'font-style', 'font-variation-settings', 'font-weight',
	'letter-spacing', 'line-height', 'max-inline-size', 'text-align', 'text-decoration', 'text-wrap',
	'margin', 'padding'
]

const rootPositioning: EditorPositioningCapability = {
	editable: true,
	modes: ['static', 'relative', 'absolute', 'sticky', 'fixed'],
	offsets: [...EDITOR_POSITION_OFFSETS],
	responsive: true,
	zIndex: {editable: true, tokens: [...EDITOR_Z_INDEX_TOKENS], allowCustom: false}
}

const localPositioning: EditorPositioningCapability = {
	editable: true,
	modes: ['static', 'relative'],
	offsets: [...EDITOR_POSITION_OFFSETS],
	responsive: true,
	zIndex: {editable: true, tokens: ['z-index-base', 'z-index-raised'], allowCustom: false}
}

const definitions = [
	['field', 'Field', 'forms', ['root', 'label', 'description', 'hint', 'error', 'control'], ['default', 'disabled', 'focus', 'invalid', 'pending'], ['default'], ['change'], true],
	['input', 'Input', 'forms', ['root', 'label', 'description', 'hint', 'error', 'input-shell', 'control', 'prefix', 'suffix', 'clear', 'reveal'], ['default', 'disabled', 'focus', 'invalid', 'pending'], [], ['change'], true],
	['textarea', 'Textarea', 'forms', ['root', 'label', 'description', 'hint', 'error', 'control', 'counter'], ['default', 'disabled', 'focus', 'invalid'], [], ['change'], true],
	['checkbox', 'Checkbox', 'choices', ['root', 'control', 'indicator', 'label', 'description', 'error'], ['unchecked', 'checked', 'indeterminate', 'disabled', 'focus', 'invalid'], [], ['checkbox-change'], false],
	['radio-group', 'Radio group', 'choices', ['root', 'label', 'option', 'control', 'indicator', 'option-label', 'description'], ['default', 'selected', 'disabled', 'focus', 'invalid'], ['horizontal', 'vertical'], ['radio-change'], true],
	['switch', 'Switch', 'choices', ['root', 'control', 'switch-label', 'track', 'thumb', 'label', 'description'], ['off', 'on', 'disabled', 'focus', 'invalid'], [], ['switch-change'], false],
	['combobox', 'Combobox', 'collections', ['root', 'label', 'description', 'control', 'input', 'clear', 'indicator', 'native-input', 'listbox', 'option', 'error'], ['closed', 'open', 'disabled', 'focus', 'invalid', 'selected', 'active'], [], ['combobox-change'], true],
	['multi-select', 'Multi-select', 'collections', ['root', 'label', 'control', 'chips', 'chip', 'chip-remove', 'input', 'listbox', 'option', 'select-all', 'clear'], ['closed', 'open', 'disabled', 'focus', 'invalid', 'max-selected'], [], ['multi-select-change'], true],
	['dropdown-menu', 'Dropdown menu', 'layers', ['root', 'trigger', 'content', 'label', 'item', 'indicator', 'separator', 'submenu-trigger', 'submenu-content'], ['closed', 'open', 'active', 'checked', 'disabled'], [], ['menu-select'], true],
	['tooltip', 'Tooltip', 'layers', ['root', 'trigger', 'content', 'arrow'], ['closed', 'open'], [], [], true],
	['tabs', 'Tabs', 'navigation', ['root', 'list', 'tab', 'panel', 'indicator'], ['default', 'active', 'disabled', 'focus'], ['panels', 'navigation'], ['tabs-change'], true],
	['accordion', 'Accordion', 'navigation', ['root', 'item', 'heading', 'trigger', 'indicator', 'panel'], ['closed', 'open', 'disabled', 'focus'], ['single', 'multiple'], ['accordion-change'], true],
	['slider', 'Slider', 'values', ['root', 'label', 'track', 'range', 'thumb', 'input'], ['default', 'disabled', 'focus'], ['single', 'range'], ['slider-change'], false],
	['number-input', 'Number input', 'values', ['root', 'label', 'control', 'input', 'increment', 'decrement'], ['default', 'disabled', 'focus', 'invalid'], [], ['number-input-change'], false],
	['segmented-control', 'Segmented control', 'choices', ['root', 'label', 'option', 'indicator', 'option-label'], ['default', 'selected', 'disabled', 'focus'], ['horizontal', 'vertical'], ['segmented-change'], true],
	['select', 'Select', 'collections', ['root', 'label', 'description', 'trigger', 'value', 'indicator', 'native-select', 'listbox', 'group-label', 'option', 'option-copy', 'error'], ['closed', 'open', 'disabled', 'focus', 'invalid', 'selected', 'active'], [], ['select-change'], true],
	['dialog', 'Dialog', 'layers', ['root', 'trigger', 'dialog', 'surface', 'header', 'body', 'footer', 'confirm', 'cancel'], ['closed', 'open', 'busy'], ['primary', 'danger'], ['dialog-confirm', 'dialog-close'], true],
	['modal', 'Modal', 'layers', ['root', 'trigger', 'dialog', 'surface', 'header', 'body', 'footer', 'close'], ['closed', 'open'], ['sm', 'md', 'lg', 'xl'], ['modal-close'], true],
	['popover', 'Popover', 'layers', ['root', 'trigger', 'panel'], ['closed', 'open'], [], ['popover-close'], true],
	['part', 'Part', 'advanced', ['root'], ['default', 'disabled', 'selected', 'active'], [], [], true]
] as const

const makeManifest = (definition: (typeof definitions)[number]): EditorComponentManifest => {
	const [id, label, category, parts, states, variants, events, hasSlot] = definition
	const editorStates = [...new Set([...states, 'hover', 'focus-visible', 'active'])]
	const raw: EditorComponentManifest = {
		schemaVersion: 2,
		id,
		label,
		category,
		owner: '@ooopsstudio/ui-primitives',
		insertable: id !== 'part',
		adapters: {
			astro: `@ooopsstudio/ui-astro/${adapterName(id)}.astro`,
			svelte: `@ooopsstudio/ui-svelte/${adapterName(id)}.svelte`,
			...(id === 'part' ? {} : {controller: '@ooopsstudio/ui-primitives'})
		},
		props: [...commonProps, ...(propsById[id] ?? [])],
		slots: hasSlot ? [{id: 'default', label: 'Content', editable: true}] : [],
		events: events.map((event) => ({id: event, label: event.split('-').map(capitalize).join(' ')})),
		parts: parts.map((partId) => ({
			id: partId,
			selector: partId === 'root' ? ':scope' : `[data-part='${partId}']`,
			states: editorStates,
			forceableStates: editorStates.filter((state) =>
				(EDITOR_FORCEABLE_STATES as readonly string[]).includes(state)) as EditorForceableState[],
			styleProperties: isTextPart(partId) ? textStyles : surfaceStyles,
			responsive: true,
			positioning: positioningFor(id, partId),
			...(isTextPart(partId) ? {typography: {
				fluidSize: true,
				variableAxes: [],
				textFit: true,
				maxLineLength: true,
				wrapping: ['wrap', 'nowrap', 'balance', 'pretty', 'stable'] as const
			}} : {})
		})),
		variants: [...variants]
	}
	const parsed = parseComponentManifest(raw)
	if (!parsed.ok) throw new Error(`Invalid built-in UI manifest ${id}: ${parsed.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`)
	return parsed.value
}

export const uiComponentManifests: Readonly<Record<string, UiComponentManifest>> = Object.freeze(
	Object.fromEntries(definitions.map((definition) => [definition[0], makeManifest(definition)]))
)

export const getUiComponentManifest = (id: string) => uiComponentManifests[id] ?? null
export const validateUiComponentManifest = validateComponentManifest

function adapterName(id: string) {
	return id.split('-').map(capitalize).join('')
}

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

function isTextPart(part: string) {
	return /label|description|hint|error|title|value|counter/.test(part)
}

function positioningFor(componentId: string, partId: string): EditorPositioningCapability {
	if (partId === 'root') return rootPositioning
	if (!isRuntimeLayerPart(componentId, partId)) return localPositioning
	const modal = componentId === 'dialog' || componentId === 'modal'
	return {
		editable: false,
		modes: modal ? ['fixed'] : ['absolute', 'fixed'],
		offsets: [],
		responsive: false,
		zIndex: {
			editable: false,
			tokens: [modal ? 'z-index-modal' : 'z-index-dropdown'],
			allowCustom: false
		}
	}
}

function isRuntimeLayerPart(componentId: string, partId: string) {
	if (['dialog', 'modal'].includes(componentId) && ['dialog', 'surface'].includes(partId)) return true
	if (['select', 'combobox', 'multi-select'].includes(componentId) && partId === 'listbox') return true
	if (componentId === 'dropdown-menu' && ['content', 'submenu-content'].includes(partId)) return true
	if (componentId === 'tooltip' && ['content', 'arrow'].includes(partId)) return true
	return componentId === 'popover' && partId === 'panel'
}
