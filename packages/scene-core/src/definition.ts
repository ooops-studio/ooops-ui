import {
	SCENE_QUALITIES,
	SCENE_REQUESTED_BACKENDS,
	type InteractiveSceneDefinition,
	type InteractiveSceneRuntimeManifest
} from './types'

const sceneId = /^[a-z][a-z0-9-]{0,63}$/
const qualities = new Set<string>(SCENE_QUALITIES)
const backends = new Set<string>(SCENE_REQUESTED_BACKENDS)

const validateRuntimeManifest = (manifest: InteractiveSceneRuntimeManifest) => {
	if (!manifest || typeof manifest !== 'object') throw new TypeError('Interactive scene requires a runtime manifest.')
	if (!sceneId.test(manifest.id)) throw new TypeError('Interactive scene id is invalid.')
	if (!backends.has(manifest.backend)) throw new TypeError(`Unsupported interactive scene backend: ${manifest.backend}.`)
	if (!Array.isArray(manifest.quality?.allowed) || manifest.quality.allowed.length === 0) {
		throw new TypeError('Interactive scene must allow at least one quality.')
	}
	if (new Set(manifest.quality.allowed).size !== manifest.quality.allowed.length) {
		throw new TypeError('Interactive scene qualities must be unique.')
	}
	if (manifest.quality.allowed.some((quality) => !qualities.has(quality))) {
		throw new TypeError('Interactive scene contains an unsupported quality.')
	}
	if (!manifest.quality.allowed.includes(manifest.quality.default)) {
		throw new TypeError('Interactive scene default quality must be allowed.')
	}
	if (!['poster', 'static'].includes(manifest.fallbacks?.reducedMotion)) {
		throw new TypeError('Interactive scene reduced-motion fallback is invalid.')
	}
	if (!['poster', 'hidden'].includes(manifest.fallbacks?.contextLoss)) {
		throw new TypeError('Interactive scene context-loss fallback is invalid.')
	}
}

export const defineInteractiveScene = <Config>(
	definition: InteractiveSceneDefinition<Config>
): InteractiveSceneDefinition<Config> => {
	if (typeof definition?.create !== 'function') {
		throw new TypeError('Interactive scene definition requires a create function.')
	}
	validateRuntimeManifest(definition.manifest)
	return Object.freeze({
		manifest: Object.freeze({...definition.manifest}),
		create: definition.create
	})
}
