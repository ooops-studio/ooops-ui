import assert from 'node:assert/strict'
import {test} from 'node:test'

import Reporter from './feature-coverage-reporter.mjs'
import {matrixDigest, validateMatrix, verifyFeatureEvidence} from './feature-coverage.mjs'

const matrix = {version: 2, projects: {astro: 'astro-chromium', svelte: 'svelte-chromium', primitives: 'primitives-chromium'},
	features: [{id: 'FM-EXAMPLE', branches: ['open', 'close'], adapters: ['astro', 'svelte']}]}
const record = (id, project) => ({id: `FM-EXAMPLE/${id}`, project: `${project}-chromium`,
	status: 'passed', expectedStatus: 'passed', retry: 0, assertions: 1})
const evidence = () => ({version: 1, runner: 'playwright', runId: 'current-run', matrixDigest: matrixDigest(matrix),
	status: 'passed', cases: ['astro', 'svelte'].flatMap((adapter) => ['open', 'close'].map((branch) => record(branch, adapter)))})
const verify = (report) => verifyFeatureEvidence(matrix, report, 'current-run')

test('every declared branch/adapter needs a real passing execution', () => {
	assert.deepEqual(verify(evidence()), [])
	const report = evidence()
	report.cases.pop()
	assert.match(verify(report).join('\n'), /svelte-chromium:FM-EXAMPLE\/close/)
	assert.ok(verify({...evidence(), cases: []}).length)
})
test('comments/source markers, stale reports, other runners and changed matrices cannot count as evidence', () => {
	for (const report of [{markers: '[FM-EXAMPLE]'}, {...evidence(), runId: 'old-run'},
		{...evidence(), runner: 'source-scan'}, {...evidence(), matrixDigest: 'old-matrix'}]) {
		assert.match(verify(report).join(''), /Missing, stale or incompatible/)
	}
})
test('failed, skipped, timed out, interrupted, expected-failure and assertion-free cases block', () => {
	for (const override of [{status: 'failed'}, {status: 'skipped'}, {status: 'timedOut'},
		{status: 'interrupted'}, {expectedStatus: 'failed'}, {assertions: 0}, {assertions: null}, {retry: 1}]) {
		const report = evidence()
		Object.assign(report.cases[0], override)
		assert.ok(verify(report).length, JSON.stringify(override))
	}
	assert.ok(verify({...evidence(), status: 'failed'}).length)
})
test('duplicates, flaky retries and unknown cases do not fill a missing branch', () => {
	const report = evidence()
	report.cases.push({...report.cases[0]})
	assert.match(verify(report).join(''), /expected one execution/)
	report.cases.at(-1).retry = 1
	report.cases[0].status = 'failed'
	assert.ok(verify(report).length)
	report.cases.at(-1).id = 'FM-EXAMPLE/invented'
	assert.match(verify(report).join(''), /Unknown execution/)
})
test('matrix schema rejects empty/duplicate branches, unknown adapters and unsupported overrides', () => {
	assert.deepEqual(validateMatrix(matrix), [])
	for (const feature of [{...matrix.features[0], branches: []},
		{...matrix.features[0], branches: ['open', 'open']}, {...matrix.features[0], adapters: ['unknown']},
		{...matrix.features[0], branchAdapters: {open: ['primitives']}}]) {
		assert.ok(validateMatrix({...matrix, features: [feature]}).length)
	}
	assert.ok(validateMatrix({...matrix, features: [...matrix.features, matrix.features[0]]}).length)
	assert.ok(validateMatrix({}).length)
})
test('explicit adapter applicability preserves every applicable requirement', () => {
	const scoped = {...matrix, features: [{...matrix.features[0], branchAdapters: {close: ['svelte']}}]}
	const report = evidence()
	report.matrixDigest = matrixDigest(scoped)
	report.cases = report.cases.filter((entry) => entry.project !== 'astro-chromium' || !entry.id.endsWith('/close'))
	assert.deepEqual(verifyFeatureEvidence(scoped, report, 'current-run'), [])
	report.cases.pop()
	assert.ok(verifyFeatureEvidence(scoped, report, 'current-run').length)
})
test('reporter counts only successful expect steps inside the specific branch', () => {
	const reporter = new Reporter({})
	const test = {expectedStatus: 'passed', parent: {project: () => ({name: 'astro-chromium'})}}
	reporter.onTestEnd(test, {status: 'passed', retry: 0, steps: [
		{title: 'beforeEach expect', category: 'expect', steps: []},
		{title: '[FM-EXAMPLE/open]', category: 'test.step', steps: [
			{category: 'expect', steps: []}, {category: 'expect', error: new Error('failed'), steps: []}]},
		{title: '[FM-EXAMPLE/close]', category: 'test.step', steps: []}]})
	assert.equal(reporter.cases[0].assertions, 1)
	assert.equal(reporter.cases[1].assertions, 0)
})
