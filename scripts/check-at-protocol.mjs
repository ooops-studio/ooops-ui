import {readFile} from 'node:fs/promises'

const matrixUrl = new URL('../tests/assistive-technology/matrix.json', import.meta.url)
const matrix = JSON.parse(await readFile(matrixUrl, 'utf8'))
const requiredEnvironments = new Set(['voiceover-safari', 'nvda-firefox', 'nvda-chrome'])
const requiredComponents = new Set([
	'Input', 'Textarea', 'Checkbox', 'Switch', 'RadioGroup', 'Select', 'Combobox',
	'MultiSelect', 'DropdownMenu', 'Tooltip', 'Popover', 'Dialog', 'Modal', 'Tabs',
	'Accordion', 'Slider', 'NumberInput', 'SegmentedControl'
])

if (matrix.version !== 1)
	throw new Error('Assistive-technology matrix must use version 1.')

const environmentIds = new Set(matrix.requiredEnvironments?.map((entry) => entry.id))
for (const id of requiredEnvironments)
	if (!environmentIds.has(id)) throw new Error(`Missing required assistive-technology environment: ${id}`)

const scenarioIds = new Set()
const coveredComponents = new Set()
for (const scenario of matrix.scenarios ?? []) {
	if (!scenario.id || scenarioIds.has(scenario.id)) throw new Error(`Invalid or duplicate AT scenario: ${scenario.id ?? '<missing>'}`)
	scenarioIds.add(scenario.id)
	if (!Array.isArray(scenario.expect) || scenario.expect.length === 0) throw new Error(`AT scenario ${scenario.id} needs expected announcements.`)
	for (const component of scenario.components ?? []) coveredComponents.add(component)
}

for (const component of requiredComponents)
	if (!coveredComponents.has(component)) throw new Error(`AT protocol does not cover ${component}.`)

const requiredEvidence = new Set(matrix.evidence?.requiredFields)
for (const field of ['environmentId', 'tester', 'date', 'app', 'commit', 'scenarioResults', 'notes'])
	if (!requiredEvidence.has(field)) throw new Error(`AT evidence schema is missing ${field}.`)

console.log(`Assistive-technology protocol covers ${environmentIds.size} environments and ${coveredComponents.size} components.`)
