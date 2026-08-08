import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const directory = resolve('tests/apps/astro/public')
mkdirSync(directory, {recursive: true})
writeFileSync(
	resolve(directory, 'fixture-scene.png'),
	Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/XPWsWQAAAABJRU5ErkJggg==',
		'base64'
	)
)
