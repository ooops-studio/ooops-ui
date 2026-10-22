import {spawn} from 'node:child_process'
import {mkdtemp, writeFile, rm, readdir} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import path from 'node:path'

const repo = process.cwd()
const temp = await mkdtemp(path.join(tmpdir(), 'ooops-rich-text-standalone-'))
const run = (command, args, cwd) => new Promise((resolve, reject) => {
	const child = spawn(command, args, {cwd, stdio: 'inherit'})
	child.on('error', reject)
	child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)))
})
try {
	const artifacts = new Map()
	for (const name of ['ui-primitives', 'ui-svelte', 'ui-rich-text']) {
		const previous = new Set(await readdir(temp))
		await run('pnpm', ['pack', '--pack-destination', temp], path.join(repo, `packages/${name}`))
		const artifact = (await readdir(temp)).find((file) => file.endsWith('.tgz') && !previous.has(file))
		if (!artifact) throw new Error(`No packed artifact found for ${name}`)
		artifacts.set(name, artifact)
	}
	const tarball = artifacts.get('ui-rich-text')
	await writeFile(path.join(temp, 'package.json'), JSON.stringify({
		name: 'standalone-rich-text-consumer', private: true, type: 'module',
		dependencies: {
			'@ooopsstudio/ui-rich-text': `file:./${tarball}`,
			'@tiptap/core': '3.30.5', '@tiptap/pm': '3.30.5', '@tiptap/starter-kit': '3.30.5',
			svelte: '5.56.8', vite: '^7.3.7', '@sveltejs/vite-plugin-svelte': '^6.2.4'
		}
	}, null, 2))
	await writeFile(path.join(temp, 'pnpm-workspace.yaml'),
		`packages: []\nautoInstallPeers: false\nallowBuilds:\n  esbuild: true\noverrides:\n  '@ooopsstudio/ui-primitives': 'file:./${artifacts.get('ui-primitives')}'\n  '@ooopsstudio/ui-svelte': 'file:./${artifacts.get('ui-svelte')}'\n`)
	await run('pnpm', ['install', '--config.auto-install-peers=false'], temp)
	const require = createRequire(path.join(temp, 'node_modules/@ooopsstudio/ui-rich-text/dist/index.js'))
	for (const optional of ['yjs', '@tiptap/extension-collaboration']) {
		let installed = true
		try {require.resolve(optional)} catch {installed = false}
		if (installed) throw new Error(`Standalone consumer unexpectedly installed ${optional}`)
	}
	await writeFile(path.join(temp, 'index.html'), '<main id="app"></main><script type="module" src="/main.js"></script>')
	await writeFile(path.join(temp, 'main.js'),
		"import {mount} from 'svelte'; import App from './App.svelte'; mount(App,{target:document.querySelector('#app')});")
	await writeFile(path.join(temp, 'App.svelte'), `<script>
		import {RichTextEditor, RichTextToolbar} from '@ooopsstudio/ui-rich-text';
		let html = $state('<p>Standalone</p>'); let editor = $state(null);
	</script><RichTextToolbar {editor}/><RichTextEditor bind:html bind:editor/>`)
	await writeFile(path.join(temp, 'vite.config.js'),
		"import {svelte} from '@sveltejs/vite-plugin-svelte'; export default {plugins:[svelte()]};")
	await run('pnpm', ['exec', 'vite', 'build'], temp)
	console.log('Packed standalone editor builds without Yjs or Collaboration installed.')
} finally {
	await rm(temp, {recursive: true, force: true})
}
