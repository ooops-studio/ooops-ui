import {createHash} from 'node:crypto'

const adapters = new Set(['primitives', 'astro', 'svelte'])
export const matrixDigest = (matrix) => createHash('sha256').update(JSON.stringify(matrix)).digest('hex')

export function validateMatrix(matrix) {
	const failures = [], ids = new Set()
	if (matrix?.version !== 2 || !Array.isArray(matrix.features) || !matrix.features.length) {
		return ['Feature matrix must use version 2 with nonempty features']
	}
	for (const feature of matrix.features) {
		if (!/^FM-[A-Z0-9-]+$/.test(feature.id) || ids.has(feature.id)) failures.push(`Invalid/duplicate feature: ${feature.id}`)
		ids.add(feature.id)
		for (const [key, values] of [['branches', feature.branches], ['adapters', feature.adapters]]) {
			if (!Array.isArray(values) || !values.length || new Set(values).size !== values.length) {
				failures.push(`${feature.id}: invalid/duplicate ${key}`)
				continue
			}
			for (const value of values) {
				if (key === 'branches' ? !/^[a-z][a-z0-9-]*$/.test(value) : !adapters.has(value)) {
					failures.push(`${feature.id}: invalid ${key} ${value}`)
				}
			}
		}
		for (const [branch, targets] of Object.entries(feature.branchAdapters ?? {})) {
			if (!feature.branches?.includes(branch) || !Array.isArray(targets) || !targets.length ||
				new Set(targets).size !== targets.length ||
				targets.some((target) => !feature.adapters?.includes(target))) {
				failures.push(`${feature.id}: invalid branch adapter override ${branch}`)
			}
		}
	}
	for (const adapter of adapters) {
		if (matrix.projects?.[adapter] !== `${adapter}-chromium`) failures.push(`Missing Chromium evidence project for ${adapter}`)
	}
	return failures
}

export function verifyFeatureEvidence(matrix, report, runId) {
	const failures = validateMatrix(matrix)
	if (failures.length) return failures
	if (report?.version !== 1 || report.runner !== 'playwright' || report.runId !== runId ||
		report.matrixDigest !== matrixDigest(matrix) || !Array.isArray(report.cases)) {
		return ['Missing, stale or incompatible execution evidence']
	}
	if (report.status !== 'passed') failures.push(`Runner did not pass: ${report.status}`)
	const expected = new Set(), records = new Map()
	for (const feature of matrix.features) for (const adapter of feature.adapters) {
		for (const branch of feature.branches) {
			if (!(feature.branchAdapters?.[branch] ?? feature.adapters).includes(adapter)) continue
			expected.add(`${matrix.projects[adapter]}:${feature.id}/${branch}`)
		}
	}
	for (const result of report.cases) {
		const key = `${result.project}:${result.id}`
		if (!expected.has(key)) { failures.push(`Unknown execution case: ${key}`); continue }
		const previous = records.get(key) ?? []
		previous.push(result)
		records.set(key, previous)
	}
	for (const key of expected) {
		const results = records.get(key) ?? []
		if (results.length !== 1) { failures.push(`${key}: expected one execution, received ${results.length}`); continue }
		const result = results[0]
		if (result.status !== 'passed' || result.expectedStatus !== 'passed' || result.retry !== 0 ||
			!Number.isInteger(result.assertions) || result.assertions < 1) {
			failures.push(`${key}: requires a first-attempt passing test/step with assertions`)
		}
	}
	return failures
}
