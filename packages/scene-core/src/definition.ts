import {parseInteractiveSceneManifest} from '@ooopsstudio/editor-contracts'

import type {InteractiveSceneDefinition} from './types'

export const defineInteractiveScene = <Config>(
	definition: InteractiveSceneDefinition<Config>
): InteractiveSceneDefinition<Config> => {
	if (typeof definition?.create !== 'function') {
		throw new TypeError('Interactive scene definition requires a create function.')
	}
	const parsed = parseInteractiveSceneManifest(definition.manifest)
	if (!parsed.ok) {
		throw new TypeError(
			`Invalid interactive scene manifest: ${parsed.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`
		)
	}
	return Object.freeze({manifest: parsed.value, create: definition.create})
}
