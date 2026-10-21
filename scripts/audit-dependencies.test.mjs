import assert from 'node:assert/strict'
import {test} from 'node:test'

import {evaluateAudit} from './audit-dependencies.mjs'

const advisory = {severity: 'high', module_name: 'braces', github_advisory_id: 'GHSA-example', findings: [{dev: true, version: '3.0.3'}]}
const entry = {module: 'braces', ghsa: 'GHSA-example', version: '3.0.3', reviewBy: '2026-11-21', reason: 'Fixed repository inputs', source: 'https://example.test/advisory'}
const report = (value) => ({advisories: {one: value}, metadata: {}})
const check = (value = advisory, exceptions = [entry], mode = 'dev', date = '2026-10-21') => evaluateAudit(report(value), {devOnly: exceptions}, mode, date)

test('only exact, reviewed development findings are accepted', () => {
	assert.equal(check().accepted.length, 1)
	assert.equal(check({...advisory, findings: [{dev: true, version: '3.0.4'}]}).blocked.length, 1)
	assert.equal(check({...advisory, module_name: 'different'}).blocked.length, 1)
	assert.equal(check({...advisory, github_advisory_id: 'new-advisory'}).blocked.length, 1)
})
test('production paths remain blocking in either audit mode', () => {
	assert.equal(check(advisory, [entry], 'prod').blocked.length, 1)
	assert.equal(check({...advisory, findings: [{dev: false, version: '3.0.3'}]}).blocked.length, 1)
	assert.equal(check({...advisory, findings: [...advisory.findings, {dev: false, version: '3.0.3'}]}).blocked.length, 1)
	assert.equal(check({...advisory, findings: []}).blocked.length, 1)
})
test('exceptions expire and missing review metadata fails closed', () => {
	assert.equal(check(advisory, [entry], 'dev', '2026-11-22').blocked.length, 1)
	for (const key of ['reviewBy', 'reason', 'source']) assert.equal(check(advisory, [{...entry, [key]: ''}]).blocked.length, 1)
})
test('empty reports pass, low-only reports preserve the moderate threshold, malformed reports fail', () => {
	assert.equal(evaluateAudit({advisories: {}, metadata: {}}, {devOnly: []}, 'prod', '2026-10-21').blocked.length, 0)
	assert.equal(check({...advisory, severity: 'low'}).blocked.length, 0)
	assert.throws(() => evaluateAudit({error: 'service unavailable'}, {devOnly: []}, 'dev', '2026-10-21'))
	assert.throws(() => evaluateAudit({advisories: {}, metadata: {}, error: 'failed'}, {devOnly: []}, 'dev', '2026-10-21'))
	assert.throws(() => evaluateAudit({advisories: [], metadata: {}}, {devOnly: []}, 'dev', '2026-10-21'))
})
