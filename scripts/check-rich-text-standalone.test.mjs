import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'

test('standalone consumer uses same-release tarballs before their versions exist on npm', () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'ooops-standalone-regression-'))
	try {
		const bin = path.join(directory, 'bin'), receipt = path.join(directory, 'receipt.json')
		mkdirSync(bin)
		for (const name of ['ui-rich-text', 'ui-svelte', 'ui-primitives']) {
			mkdirSync(path.join(directory, 'packages', name), {recursive: true})
		}
		writeFileSync(path.join(bin, 'pnpm'), `#!/usr/bin/env node
const fs=require('node:fs'), path=require('node:path');
const args=process.argv.slice(2);
if(args[0]==='pack'){
 const name=path.basename(process.cwd());
 fs.writeFileSync(path.join(args[args.indexOf('--pack-destination')+1],name+'-unpublished.tgz'),'fixture');
}else if(args[0]==='install'){
 const workspace=fs.readFileSync('pnpm-workspace.yaml','utf8');
 const manifest=JSON.parse(fs.readFileSync('package.json','utf8'));
 for(const name of ['ui-primitives','ui-svelte']){
  if(!workspace.includes("'@ooopsstudio/"+name+"': 'file:./"+name+"-unpublished.tgz'"))process.exit(9);
  if(!fs.existsSync(name+'-unpublished.tgz'))process.exit(10);
 }
 if(!args.includes('--config.auto-install-peers=false'))process.exit(11);
 fs.writeFileSync(process.env.STANDALONE_RECEIPT,JSON.stringify({workspace,manifest}));
}else if(args.join(' ')!=='exec vite build')process.exit(12);
`, {mode: 0o755})
		const script = fileURLToPath(new URL('./check-rich-text-standalone.mjs', import.meta.url))
		const result = spawnSync(process.execPath, [script], {cwd: directory, encoding: 'utf8',
			env: {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`,
				STANDALONE_RECEIPT: receipt}})
		assert.equal(result.status, 0, result.stdout + result.stderr)
		const {workspace, manifest} = JSON.parse(readFileSync(receipt, 'utf8'))
		assert.equal(manifest.dependencies['@ooopsstudio/ui-rich-text'], 'file:./ui-rich-text-unpublished.tgz')
		assert.match(workspace, /autoInstallPeers: false/)
		assert.equal('yjs' in manifest.dependencies, false)
		assert.equal('@tiptap/extension-collaboration' in manifest.dependencies, false)
	} finally {
		rmSync(directory, {recursive: true, force: true})
	}
})
