import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'

import {validateMatrix} from './feature-coverage.mjs'

export const checkMatrix = async() => {
	const matrix = JSON.parse(await readFile(new URL('../tests/coverage/feature-matrix.json', import.meta.url)))
	const failures = validateMatrix(matrix)
	if (failures.length) throw new Error(failures.join('\n'))
	console.log(`Feature matrix schema verified: ${matrix.features.length} features. Execution evidence requires pnpm test:feature-coverage.`)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await checkMatrix()
