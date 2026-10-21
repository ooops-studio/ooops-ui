import assert from 'node:assert/strict'
import {test} from 'node:test'

import {evaluateAudit} from './audit-dependencies.mjs'

const advisory = {severity: 'high', module_name: 'braces', github_advisory_id: 'GHSA-vfj7-8cjw-p6xm'}
const report = (value) => ({advisories: {one: value}, metadata: {}})

test('all moderate, high and critical findings block, including the former dev-only exceptions', () => {
	for (const [module, ghsa] of [
		['braces', 'GHSA-vfj7-8cjw-p6xm'], ['sprintf-js', 'GHSA-hp3w-g68c-fv3c']
	]) {
		for (const severity of ['moderate', 'high', 'critical']) {
			for (const dev of [true, false]) {
				const finding = {...advisory, module_name: module, github_advisory_id: ghsa,
					severity, findings: [{dev, version: '1.0.0'}]}
				assert.deepEqual(evaluateAudit(report(finding)), {blocked: [finding]})
			}
		}
	}
})

test('unknown advisories and missing finding paths cannot bypass the severity gate', () => {
	for (const findings of [undefined, [], [{dev: true}]]) {
		const finding = {...advisory, github_advisory_id: 'GHSA-new', findings}
		assert.deepEqual(evaluateAudit(report(finding)).blocked, [finding])
	}
})

test('empty reports pass and only informational/low advisories remain below the moderate threshold', () => {
	assert.deepEqual(evaluateAudit({advisories: {}, metadata: {}}), {blocked: []})
	for (const severity of ['info', 'low']) {
		assert.deepEqual(evaluateAudit(report({...advisory, severity})), {blocked: []})
	}
})

test('service errors and malformed reports or advisory severities fail closed', () => {
	for (const value of [null, {}, {error: 'service unavailable'},
		{advisories: {}, metadata: {}, error: 'failed'}, {advisories: [], metadata: {}},
		{advisories: {}, metadata: 'invalid'}, report(null), report({}),
		report({...advisory, severity: 'unknown'})]) {
		assert.throws(() => evaluateAudit(value), /Invalid audit/)
	}
})
