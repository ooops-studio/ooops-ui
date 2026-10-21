import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

const exec = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const cli = path.join(path.dirname(require.resolve('@changesets/cli/package.json')), 'bin.js')
const config = JSON.parse(await readFile(new URL('../.changeset/config.json', import.meta.url), 'utf8'))
const readJson = async(file) => JSON.parse(await readFile(file, 'utf8'))
const run = (command, args, cwd, env = process.env) => exec(command, args, {
	cwd, env, timeout: 60_000, maxBuffer: 4 * 1024 * 1024
})

test('the installed workspace graph contains neither braces nor sprintf-js', async() => {
	const {stdout} = await run('pnpm', ['why', '-r', 'braces', 'sprintf-js', '--json'], repoRoot)
	assert.deepEqual(JSON.parse(stdout), [], 'A vulnerable dependency path has returned')
})

test('Changesets discovers pnpm packages, versions dependencies, renders GitHub changelogs and tags locally',
	{timeout: 60_000}, async(t) => {
		const cwd = await mkdtemp(path.join(tmpdir(), 'ooops-ui-release-toolchain-'))
		t.after(() => rm(cwd, {recursive: true, force: true}))
		const json = (file, value) => writeFile(path.join(cwd, file), `${JSON.stringify(value, null, 2)}\n`)
		// CLI-spawned git commands must work without a developer's global Git identity/config.
		const env = {...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1'}
		const changeset = (...args) => run(process.execPath, [cli, ...args], cwd, env)
		const git = (...args) => run('git', args, cwd, env)
		await mkdir(path.join(cwd, '.changeset'))
		await json('package.json', {name: 'release-fixture', private: true,
			packageManager: JSON.parse(await readFile(new URL('../package.json', import.meta.url))).packageManager})
		await writeFile(path.join(cwd, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
		await json('.changeset/config.json', {...config, format: false,
			changelog: [require.resolve(config.changelog[0]), config.changelog[1]]})
		const packages = [
			{name: '@fixture/core', version: '0.4.0'},
			{name: '@fixture/adapter', version: '1.0.0', dependencies: {'@fixture/core': 'workspace:^'}},
			{name: '@fixture/app', version: '0.0.1', private: true}
		]
		for (const pkg of packages) {
			const dir = `packages/${pkg.name.split('/')[1]}`
			await mkdir(path.join(cwd, dir), {recursive: true})
			await json(`${dir}/package.json`, pkg)
		}
		await git('init', '--initial-branch=main')
		await git('config', '--local', 'user.name', 'Release test')
		await git('config', '--local', 'user.email', 'release-test@example.invalid')
		await git('config', '--local', 'core.hooksPath', '/dev/null')
		await git('config', '--local', 'commit.gpgsign', 'false')
		await git('config', '--local', 'tag.gpgsign', 'false')
		await git('add', '.')
		await git('commit', '-m', 'Initialize release fixture')
		// Leave the changeset uncommitted so the real GitHub plugin needs no network/token.
		await writeFile(path.join(cwd, '.changeset/security-toolchain.md'),
			'---\n"@fixture/core": minor\n"@fixture/app": patch\n---\n\nKeep release behavior after dependency cleanup.\n')
		await changeset('status', '--output=status.json')
		const status = await readJson(path.join(cwd, 'status.json'))
		assert.equal(status.releases.find((pkg) => pkg.name === '@fixture/core').newVersion, '0.5.0')
		assert.equal(status.releases.find((pkg) => pkg.name === '@fixture/adapter').newVersion, '1.0.1')
		assert.equal(status.releases.find((pkg) => pkg.name === '@fixture/app').newVersion, '0.0.2')
		await changeset('version')
		const core = await readJson(path.join(cwd, 'packages/core/package.json'))
		const adapter = await readJson(path.join(cwd, 'packages/adapter/package.json'))
		assert.equal(core.version, '0.5.0')
		assert.equal(adapter.version, '1.0.1')
		assert.equal(adapter.dependencies['@fixture/core'], 'workspace:^')
		assert.equal((await readJson(path.join(cwd, 'packages/app/package.json'))).version, '0.0.2')
		assert.match(await readFile(path.join(cwd, 'packages/core/CHANGELOG.md'), 'utf8'),
			/Keep release behavior after dependency cleanup/)
		assert.match(await readFile(path.join(cwd, 'packages/adapter/CHANGELOG.md'), 'utf8'), /@fixture\/core@0\.5\.0/)
		await git('add', '.')
		await git('commit', '-m', 'Version fixture packages')
		await changeset('status', '--output=after.json')
		assert.deepEqual((await readJson(path.join(cwd, 'after.json'))).releases, [])
		// v3 deliberately fails a version command when nothing remains; don't mask this in CI.
		await assert.rejects(changeset('version'), (error) => error.code === 1)
		await changeset('git-tag')
		const {stdout: tags} = await git('tag', '--list')
		assert.deepEqual(tags.trim().split('\n').sort(), ['@fixture/adapter@1.0.1', '@fixture/core@0.5.0'])
		await changeset('git-tag') // Re-running must not recreate or duplicate existing tags.
	})

test('publisher verifies registry visibility before emitting the action v1 tag protocol', async(t) => {
	const {publishVerifiedPackage} = await import('./verified-publisher.mjs')
	for (const outcome of ['published', 'false-success', 'auth-failure', 'publish-failure', 'already-published']) {
		await t.test(outcome, async(t) => {
			const root = await mkdtemp(path.join(tmpdir(), 'ooops-publisher-test-'))
			t.after(() => rm(root, {recursive: true, force: true}))
			const logs = [], commands = []
			let published = outcome === 'already-published', tarball
			const missing = () => Object.assign(new Error('missing'), {stderr: 'npm error E404'})
			const run = async(command, args) => {
				commands.push([command, ...args])
				if (args[0] === 'view') {
					if (outcome === 'auth-failure') throw Object.assign(new Error('unauthorized'), {stderr: 'E401'})
					if (!published) throw missing()
					return {stdout: '"0.5.0"'}
				}
				if (command === 'pnpm') {
					tarball = path.join(args[2], 'fixture-0.5.0.tgz')
					await writeFile(tarball, 'packed workspace artifact')
				}
				if (command === 'npm' && args[0] === 'publish') {
					assert.equal(await readFile(args[1], 'utf8'), 'packed workspace artifact')
					assert.ok(args.includes('https://registry.example.invalid'))
					if (outcome === 'publish-failure') throw new Error('OIDC rejected')
					published = outcome !== 'false-success'
				}
				return {stdout: command === 'git' ? '' : '{}'}
			}
			const operation = publishVerifiedPackage({dir: root, manifest: {name: '@fixture/core', version: '0.5.0'}}, {
				root, registry: 'https://registry.example.invalid', env: {}, run, wait: async() => {},
				log: (message) => logs.push(message)
			})
			if (outcome === 'published') {
				assert.equal(await operation, true)
				assert.ok(logs.includes('New tag: @fixture/core@0.5.0'))
				assert.equal(commands.filter(([command]) => command === 'git').length, 2)
			} else if (outcome === 'already-published') {
				assert.equal(await operation, false)
				assert.equal(commands.length, 1)
			} else {
				await assert.rejects(operation, outcome === 'false-success' ? /absent from/ : /unauthorized|OIDC rejected/)
				assert.equal(commands.filter(([command]) => command === 'git').length, 0)
				assert.equal(logs.some((line) => line.startsWith('New tag:')), false)
			}
			if (tarball) await assert.rejects(readFile(tarball), {code: 'ENOENT'})
		})
	}
})
