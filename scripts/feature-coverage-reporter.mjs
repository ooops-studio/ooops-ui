import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {matrixDigest} from './feature-coverage.mjs'

const visit = (steps, callback) => {
	for (const step of steps) { callback(step); visit(step.steps ?? [], callback) }
}

export default class FeatureCoverageReporter {
	constructor(options) { this.options = options; this.cases = [] }
	onTestEnd(test, result) {
		visit(result.steps, (step) => {
			const match = /^\[(FM-[A-Z0-9-]+\/[a-z][a-z0-9-]*)\]$/.exec(step.title)
			if (!match || step.category !== 'test.step') return
			let assertions = 0
			visit(step.steps, (child) => { if (child.category === 'expect' && !child.error) assertions++ })
			this.cases.push({id: match[1], project: test.parent.project().name,
				status: step.error ? 'failed' : result.status, expectedStatus: test.expectedStatus,
				retry: result.retry, assertions})
		})
	}
	async onEnd(result) {
		const matrix = JSON.parse(await readFile(new URL('../tests/coverage/feature-matrix.json', import.meta.url)))
		await mkdir(path.dirname(this.options.outputFile), {recursive: true})
		await writeFile(this.options.outputFile, JSON.stringify({version: 1, runner: 'playwright',
			runId: this.options.runId, matrixDigest: matrixDigest(matrix),
			status: result.status, cases: this.cases}, null, 2))
	}
}
