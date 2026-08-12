import {validateComponentManifest} from '@ooopsstudio/editor-contracts'
import {describe, expect, it} from 'vitest'

import {
	interactiveSceneComponentManifest,
	uiComponentManifests,
	validateUiComponentManifest
} from '../src/index'

describe('@ooopsstudio/ui-editor-manifests', () => {
	it('exposes JSON-safe validated component manifests', () => {
		expect(Object.keys(uiComponentManifests)).toHaveLength(20)
		for (const entry of Object.values(uiComponentManifests)) {
			expect(validateUiComponentManifest(JSON.parse(JSON.stringify(entry)))).toBe(true)
			expect(entry.schemaVersion).toBe(2)
			expect(entry.props.length).toBeGreaterThan(0)
			expect(entry.parts.length).toBeGreaterThan(0)
			expect(Object.keys(entry.adapters).length).toBeGreaterThan(0)
		}
	})

	it('keeps interactive-scene runtime internals locked', () => {
		expect(validateComponentManifest(interactiveSceneComponentManifest)).toBe(true)
		expect(interactiveSceneComponentManifest.parts.find((part) => part.id === 'canvas'))
			.toMatchObject({positioning: {editable: false}})
	})
})
