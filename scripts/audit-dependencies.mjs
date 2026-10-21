import {spawn} from 'node:child_process'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

const blockingLevels = new Set(['moderate', 'high', 'critical'])

export const evaluateAudit = (report) => {
	if (!report || report.error || !report.metadata || !report.advisories ||
		typeof report.metadata !== 'object' || Array.isArray(report.metadata) ||
		typeof report.advisories !== 'object' || Array.isArray(report.advisories)) {
		throw new Error('Invalid audit response')
	}
	const blocked = []
	for (const advisory of Object.values(report.advisories)) {
		if (!advisory || !['info', 'low', ...blockingLevels].includes(advisory.severity)) {
			throw new Error('Invalid audit advisory')
		}
		if (!blockingLevels.has(advisory.severity)) continue
		blocked.push(advisory)
	}
	return {blocked}
}

const main = async() => {
	const mode = process.argv[2]
	if (mode !== 'prod' && mode !== 'dev') throw new Error('Use audit-dependencies.mjs prod|dev')
	const {code, stdout} = await new Promise((resolve, reject) => {
		const child = spawn('pnpm', ['audit', `--${mode}`, '--audit-level', 'moderate', '--json'], {stdio: ['ignore', 'pipe', 'inherit']})
		let stdout = ''
		child.stdout.on('data', (chunk) => { stdout += chunk })
		child.on('error', reject)
		child.on('close', (code) => resolve({code, stdout}))
	})
	const report = JSON.parse(stdout)
	if (code !== 0 && code !== 1) throw new Error(`Audit service failed (exit ${code})`)
	const result = evaluateAudit(report)
	for (const advisory of result.blocked) console.error(`${advisory.severity}: ${advisory.module_name}: ${advisory.title} (${advisory.url})`)
	console.log(`${mode} audit: ${result.blocked.length} blocking advisories (no exceptions)`)
	if (result.blocked.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => { console.error(error); process.exitCode = 1 })
}
