import {readFileSync} from 'node:fs'

import {expect, it} from 'vitest'

import {bindCollaborativeTextInput, textReplacement} from '../src/index'
it('imports on the server without creating a DOM or opening a provider', () => {
	expect(typeof document).toBe('undefined')
	expect(typeof bindCollaborativeTextInput).toBe('function')
	expect(textReplacement('same', 'same')).toEqual({start: 4, remove: 0, insert: ''})
})
it('remains an opt-in package rather than a core UI dependency', () => {
	for (const name of ['ui-primitives', 'ui-svelte', 'ui-astro']) {
		const manifest = JSON.parse(
			readFileSync(new URL(`../../${name}/package.json`, import.meta.url), 'utf8')
		)
		for (const dependency of ['yjs', '@ooopsstudio/ui-yjs-text']) {
			expect(manifest.dependencies?.[dependency]).toBeUndefined()
			expect(manifest.peerDependencies?.[dependency]).toBeUndefined()
		}
	}
})
it('never splits a shared low surrogate when different emoji use the same suffix code unit', () => {
	const before = '\uD83D\uDE00',
		after = '\uD83E\uDE00'
	const change = textReplacement(before, after)
	expect(change).toEqual({start: 0, remove: 2, insert: after})
})
