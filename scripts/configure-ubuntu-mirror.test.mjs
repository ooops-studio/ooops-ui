import assert from 'node:assert/strict'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {configureUbuntuMirror} from './configure-ubuntu-mirror.mjs'

async function fixture(t) {
	const root = await mkdtemp(path.join(tmpdir(), 'ubuntu-browser-mirror-'))
	t.after(() => rm(root, {recursive: true, force: true}))
	return root
}

test('rewrites legacy, deb822 and GitHub mirror lists, preserves settings and is idempotent', async(t) => {
	const root = await fixture(t), legacy = path.join(root, 'sources.list'), modern = path.join(root, 'ubuntu.sources')
	const mirrors = path.join(root, 'apt-mirrors.txt')
	await writeFile(legacy, 'deb http://azure.archive.ubuntu.com/ubuntu noble main\n' +
		'deb https://packages.vendor.invalid/ubuntu stable main\n')
	await writeFile(modern, 'Types: deb\nURIs: https://azure.archive.ubuntu.com/ubuntu/\n' +
		'Suites: noble noble-updates\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n')
	await writeFile(mirrors, 'http://azure.archive.ubuntu.com/ubuntu/ priority:1\n' +
		'https://security.ubuntu.com/ubuntu/ priority:2\n')
	assert.deepEqual(await configureUbuntuMirror([legacy, modern, mirrors]),
		[legacy, modern, mirrors])
	assert.equal(await readFile(legacy, 'utf8'), 'deb https://archive.ubuntu.com/ubuntu noble main\n' +
		'deb https://packages.vendor.invalid/ubuntu stable main\n')
	assert.equal(await readFile(modern, 'utf8'), 'Types: deb\nURIs: https://archive.ubuntu.com/ubuntu/\n' +
		'Suites: noble noble-updates\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n')
	assert.equal(await readFile(mirrors, 'utf8'), 'https://archive.ubuntu.com/ubuntu/ priority:1\n' +
		'https://security.ubuntu.com/ubuntu/ priority:2\n')
	assert.deepEqual(await configureUbuntuMirror([legacy, modern, mirrors]), [])
})

test('does not rewrite lookalike hosts or unrelated archive paths', async(t) => {
	const root = await fixture(t), file = path.join(root, 'sources.list')
	const content = 'deb https://azure.archive.ubuntu.com.evil.invalid/ubuntu noble main\n' +
		'deb https://azure.archive.ubuntu.com/ubuntu-extra noble main\n' +
		'deb https://vendor.invalid/?mirror=https://azure.archive.ubuntu.com/ubuntu noble main\n'
	await writeFile(file, content)
	assert.deepEqual(await configureUbuntuMirror([file]), [])
	assert.equal(await readFile(file, 'utf8'), content)
})

test('tolerates absent source formats while surfacing other filesystem errors', async(t) => {
	const root = await fixture(t)
	assert.deepEqual(await configureUbuntuMirror([path.join(root, 'absent')]), [])
	await assert.rejects(configureUbuntuMirror([root]), {code: 'EISDIR'})
})
