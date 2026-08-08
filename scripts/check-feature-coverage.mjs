import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

const root = resolve(import.meta.dirname, '..')
const matrix = JSON.parse(await readFile(resolve(root, 'tests/coverage/feature-matrix.json'), 'utf8'))
const evidence = {
	astro: await readFile(resolve(root, 'tests/e2e/astro/behavior-matrix.spec.ts'), 'utf8'),
	svelte: await readFile(resolve(root, 'tests/e2e/svelte/behavior-matrix.spec.ts'), 'utf8'),
	primitives: await readFile(resolve(root, 'packages/ui-primitives/test/model-based.test.ts'), 'utf8')
}
const failures = []
const ids = new Set()
for (const feature of matrix.features ?? []) {
	if (!/^FM-[A-Z0-9-]+$/.test(feature.id)) failures.push(`Invalid feature id: ${feature.id}`)
	if (ids.has(feature.id)) failures.push(`Duplicate feature id: ${feature.id}`)
	ids.add(feature.id)
	if (!Array.isArray(feature.branches) || feature.branches.length === 0)
		failures.push(`${feature.id} has no branches.`)
	for (const adapter of feature.adapters ?? []) {
		if (!evidence[adapter]?.includes(`[${feature.id}]`))
			failures.push(`${feature.id} has no ${adapter} evidence test.`)
	}
}
if (failures.length) {
	console.error(failures.join('\n'))
	process.exit(1)
}
console.log(`Feature matrix verified: ${matrix.features.length} features.`)
