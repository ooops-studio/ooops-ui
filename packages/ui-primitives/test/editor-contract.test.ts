import {readFileSync, readdirSync} from 'node:fs'
import {join, resolve} from 'node:path'

import {describe, expect, it} from 'vitest'

import {uiComponentManifests} from '../src/editor'

const root = resolve(import.meta.dirname, '../../..')
const readJson = (path: string) => JSON.parse(
	readFileSync(resolve(root, path), 'utf8')
) as {exports: Record<string, unknown>}
const walk = (directory: string): string[] =>
	readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
		const path = join(directory, entry.name)
		return entry.isDirectory() ? walk(path) : [path]
	})
const corpus = (path: string) => walk(resolve(root, path)).map((file) => readFileSync(file, 'utf8')).join('\n')

describe('component manifest v2 adapter parity', () => {
	it('covers every public Astro and Svelte adapter export', () => {
		const astro = readJson('packages/ui-astro/package.json').exports
		const svelte = readJson('packages/ui-svelte/package.json').exports
		for (const manifest of Object.values(uiComponentManifests)) {
			expect(Object.hasOwn(astro, `./${manifest.adapters.astro?.split('/').at(-1)}`), manifest.id).toBe(true)
			expect(Object.hasOwn(svelte, `./${manifest.adapters.svelte?.split('/').at(-1)}`), manifest.id).toBe(true)
		}
	})

	it('only advertises parts represented by real adapter/runtime hooks', () => {
		const astro = corpus('packages/ui-astro/src')
		const svelte = corpus('packages/ui-svelte/src')
		for (const manifest of Object.values(uiComponentManifests)) {
			for (const part of manifest.parts.filter((entry) => entry.id !== 'root')) {
				expect(astro, `${manifest.id}:${part.id}:astro`).toContain(part.id)
				expect(svelte, `${manifest.id}:${part.id}:svelte`).toContain(part.id)
			}
		}
	})

	it('contains no manifest-v1 token or version artifacts', () => {
		const serialized = JSON.stringify(uiComponentManifests)
		expect(serialized).not.toContain('"version":1')
		expect(serialized).not.toContain('"cssVariable"')
		expect(serialized).not.toContain('"editableTokens"')
	})

	it('exposes every supported preview state from the canonical manifest source', () => {
		const states = new Set(Object.values(uiComponentManifests).flatMap((manifest) =>
			manifest.parts.flatMap((part) => part.forceableStates ?? [])
		))
		expect([...states].sort()).toEqual([
			'active', 'disabled', 'focus-visible', 'hover', 'open', 'selected'
		])
		for (const manifest of Object.values(uiComponentManifests)) {
			for (const part of manifest.parts) {
				for (const state of part.forceableStates ?? []) expect(part.states, `${manifest.id}:${part.id}:${state}`).toContain(state)
			}
		}
	})

	it('exposes controlled positioning while locking runtime-owned layers', () => {
		for (const manifest of Object.values(uiComponentManifests)) {
			const rootPart = manifest.parts.find((part) => part.id === 'root')
			expect(rootPart?.positioning.modes, manifest.id).toContain('relative')
			expect(rootPart?.positioning.responsive, manifest.id).toBe(true)
			expect(rootPart?.positioning.zIndex.tokens, manifest.id).toContain('z-index-raised')
		}

		for (const [component, part] of [
			['select', 'listbox'],
			['combobox', 'listbox'],
			['dropdown-menu', 'content'],
			['tooltip', 'content'],
			['dialog', 'surface'],
			['modal', 'dialog'],
			['popover', 'panel']
		] as const) {
			const positioning = uiComponentManifests[component].parts.find(
				(entry) => entry.id === part
			)?.positioning
			expect(positioning?.editable, `${component}:${part}`).toBe(false)
			expect(positioning?.zIndex.editable, `${component}:${part}`).toBe(false)
			expect(positioning?.offsets, `${component}:${part}`).toEqual([])
		}
	})
})
