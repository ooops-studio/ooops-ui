import {copyFile, mkdir} from 'node:fs/promises'

await mkdir(new URL('../dist', import.meta.url), {recursive: true})
for (const file of ['InteractiveScene.astro', 'base.css']) {
	await copyFile(new URL(`../src/${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url))
}
