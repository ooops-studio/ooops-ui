import {execFile} from 'node:child_process'
import {mkdtemp, readdir, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout} from 'node:timers/promises'
import {promisify} from 'node:util'

const exec = promisify(execFile)
const execute = async(command, args, options) => {
	const result = await exec(command, args, {...options, maxBuffer: 8 * 1024 * 1024})
	if (result.stderr) process.stderr.write(result.stderr)
	return result
}

// Keep publication independent of Changesets' CLI output and package-manager choice.
export async function publishVerifiedPackage(pkg, {registry, env, root,
	run = execute, wait = () => setTimeout(5000), log = console.log}) {
	const spec = `${pkg.manifest.name}@${pkg.manifest.version}`
	const options = {cwd: pkg.dir, env}
	const exists = async() => {
		try {
			const {stdout} = await run('npm', ['view', spec, 'version', '--json', '--prefer-online', '--registry', registry], options)
			if (JSON.parse(stdout) !== pkg.manifest.version) throw new Error(`Unexpected registry version for ${spec}`)
			return true
		} catch(error) {
			// An authentication/network failure must never be mistaken for a missing version.
			if (/\bE404\b/.test(`${error.stdout ?? ''}\n${error.stderr ?? ''}`)) return false
			throw error
		}
	}
	if (await exists()) {
		log(`Already published: ${spec}`)
		return false
	}
	const directory = await mkdtemp(path.join(tmpdir(), 'ooops-verified-publish-'))
	try {
		await run('pnpm', ['pack', '--pack-destination', directory], options)
		const files = (await readdir(directory)).filter((file) => file.endsWith('.tgz'))
		if (files.length !== 1) throw new Error(`Expected one packed artifact for ${spec}`)
		// pnpm pack resolves workspace: ranges; npm CLI supplies the established OIDC publisher.
		const {stdout} = await run('npm', ['publish', path.join(directory, files[0]), '--access', 'public',
			'--tag', 'latest', '--registry', registry, '--json'], options)
		log(stdout)
		let verified = false
		// New npm packages can remain in processing for several minutes after acceptance.
		const visibilityAttempts = 61 // Initial read plus at most five minutes of waiting.
		for (let attempt = 0; attempt < visibilityAttempts; attempt++) {
			if (await exists()) { verified = true; break }
			if (attempt === 0) log(`Waiting for ${spec} registry visibility (up to five minutes).`)
			if (attempt < visibilityAttempts - 1) await wait()
		}
		if (!verified) throw new Error(`Publisher exited successfully but ${spec} is absent from ${registry}`)
		const {stdout: existingTag} = await run('git', ['tag', '--list', spec], {cwd: root, env})
		if (!existingTag.trim()) {
			await run('git', ['tag', '-a', spec, '-m', spec], {cwd: root, env})
			// action@v1 consumes this protocol to push tags/create GitHub releases.
			log(`New tag: ${spec}`)
		}
		return true
	} finally {
		await rm(directory, {recursive: true, force: true})
	}
}
