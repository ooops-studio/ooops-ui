import {spawn} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

const blockingLevels = new Set(['moderate', 'high', 'critical'])

export const evaluateAudit = (report, policy, mode, today) => {
	if (!report || report.error || !report.metadata || !report.advisories ||
		typeof report.advisories !== 'object' || Array.isArray(report.advisories)) {
		throw new Error('Invalid audit response')
	}
	const accepted = [], blocked = []
	for (const advisory of Object.values(report.advisories)) {
		if (!blockingLevels.has(advisory.severity)) continue
		const exception = mode === 'dev' && policy.devOnly.find((entry) =>
			entry.ghsa === advisory.github_advisory_id && entry.module === advisory.module_name &&
   /^\d{4}-\d{2}-\d{2}$/.test(entry.reviewBy) && entry.reviewBy >= today &&
   entry.reason && entry.source && advisory.findings?.length > 0 &&
   advisory.findings.every((finding) => finding.dev === true && finding.version === entry.version)
		)
		if (exception) accepted.push({advisory, exception})
		else blocked.push(advisory)
	}
	return {accepted, blocked}
}

const main = async() => {
	const mode = process.argv[2]
	if (mode !== 'prod' && mode !== 'dev') throw new Error('Use audit-dependencies.mjs prod|dev')
	const policy = JSON.parse(await readFile(new URL('../config/dependency-audit-policy.json', import.meta.url), 'utf8'))
	const {code, stdout} = await new Promise((resolve, reject) => {
		const child = spawn('pnpm', ['audit', `--${mode}`, '--audit-level', 'moderate', '--json'], {stdio: ['ignore', 'pipe', 'inherit']})
		let stdout = ''
		child.stdout.on('data', (chunk) => { stdout += chunk })
		child.on('error', reject)
		child.on('close', (code) => resolve({code, stdout}))
	})
	const report = JSON.parse(stdout)
	if (code !== 0 && code !== 1) throw new Error(`Audit service failed (exit ${code})`)
	const result = evaluateAudit(report, policy, mode, new Date().toISOString().slice(0, 10))
	for (const {advisory, exception} of result.accepted) {
		console.log(`Dev-only exception ${advisory.github_advisory_id}, review by ${exception.reviewBy}: ${exception.reason}`)
	}
	for (const advisory of result.blocked) console.error(`${advisory.severity}: ${advisory.module_name}: ${advisory.title} (${advisory.url})`)
	console.log(`${mode} audit: ${result.blocked.length} blocking advisories, ${result.accepted.length} scoped dev-only exceptions`)
	if (result.blocked.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => { console.error(error); process.exitCode = 1 })
}
