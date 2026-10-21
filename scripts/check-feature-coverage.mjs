import {spawn} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {copyFile, mkdir, mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import process from 'node:process'

import {verifyFeatureEvidence} from './feature-coverage.mjs'

const runId = randomUUID()
const directory = await mkdtemp(path.join(tmpdir(), 'ooops-ui-feature-evidence-'))
const reportFile = path.join(directory, 'execution.json')
const run = (args) => new Promise((resolve, reject) => {
	const child = spawn('pnpm', args, {stdio: 'inherit', env: {...process.env,
		OOOPS_FEATURE_RUN_ID: runId, OOOPS_FEATURE_REPORT: reportFile}})
	child.on('error', reject)
	child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Feature runner failed (${code})`)))
})
try {
	await run(['test:e2e:prepare'])
	await run(['exec', 'playwright', 'test', 'behavior-matrix.spec.ts', 'buttons.spec.ts', 'calendar.spec.ts', 'drawer.spec.ts', 'customization.spec.ts', '--project=primitives-chromium',
		'--project=astro-chromium', '--project=svelte-chromium', '--retries=0'])
	const matrix = JSON.parse(await readFile(new URL('../tests/coverage/feature-matrix.json', import.meta.url)))
	const report = JSON.parse(await readFile(reportFile))
	const failures = verifyFeatureEvidence(matrix, report, runId)
	if (failures.length) throw new Error(failures.join('\n'))
	console.log(`Feature execution gate passed: ${report.cases.length} branch/adapter cases with assertions.`)
} finally {
	try {
		const evidenceDirectory = path.resolve('reports/feature-coverage')
		await mkdir(evidenceDirectory, {recursive: true})
		const evidencePath = path.join(evidenceDirectory, `${runId}.json`)
		await copyFile(reportFile, evidencePath)
		console.log(`Feature execution evidence: ${evidencePath}`)
	} catch(error) {
		if (error.code !== 'ENOENT') {
			console.error('Unable to preserve feature execution evidence', error)
			process.exitCode = 1
		}
	}
	await rm(directory, {recursive: true, force: true})
}
