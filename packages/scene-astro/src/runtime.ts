import {
	createSceneCoordinator,
	createSceneHost,
	type InteractiveSceneDefinition,
	type SceneHost,
	type SceneInteractionMode,
	type SceneQuality,
	type SceneRuntimeState
} from '@ooopsstudio/scene-core'

type RegisteredScene = InteractiveSceneDefinition<unknown>
type SceneRegistration = Record<string, RegisteredScene>
type SceneConfig = {
	scene: string
	config: unknown
	quality: SceneQuality
	mode: SceneInteractionMode
}
type MountedScene = {host: SceneHost<unknown>; cleanup: () => void}

const registry = new Map<string, RegisteredScene>()
const mounted = new Map<HTMLElement, MountedScene>()
const coordinator = createSceneCoordinator()
let lifecycleInstalled = false

const readConfig = (root: HTMLElement): SceneConfig => {
	const script = root.querySelector<HTMLScriptElement>(':scope > [data-ooops-scene-config]')
	if (!script?.textContent) throw new Error('Interactive scene configuration is missing.')
	return JSON.parse(script.textContent) as SceneConfig
}

const applyState = (root: HTMLElement, state: SceneRuntimeState) => {
	root.dataset.ooopsSceneState = state.status
	root.dataset.ooopsSceneBackend = state.backend
	root.dataset.ooopsSceneQuality = state.quality
	root.dataset.ooopsSceneMode = state.interactionMode
	if (state.fallbackReason) root.dataset.ooopsSceneFallback = state.fallbackReason
	else delete root.dataset.ooopsSceneFallback
	root.dispatchEvent(new CustomEvent('ooops:scene-state-change', {detail: state}))
}

const mountRoot = async(root: HTMLElement) => {
	if (mounted.has(root)) return
	const config = readConfig(root)
	const pendingMode = root.dataset.ooopsSceneMode
	if (pendingMode === 'select' || pendingMode === 'interact') config.mode = pendingMode
	const definition = registry.get(config.scene)
	if (!definition) {
		root.dataset.ooopsSceneState = 'fallback'
		root.dataset.ooopsSceneFallback = 'unregistered-scene'
		return
	}
	const canvas = root.querySelector<HTMLCanvasElement>('[data-part="canvas"]')
	if (!canvas) throw new Error(`Interactive scene ${config.scene} is missing its canvas.`)
	const host = createSceneHost({
		element: root,
		canvas,
		definition,
		config: config.config,
		quality: config.quality,
		interactionMode: config.mode,
		coordinator,
		onStateChange: (state) => applyState(root, state)
	})
	const pause = root.querySelector<HTMLButtonElement>('[data-ooops-scene-pause]')
	const onPause = () => {
		if (!pause) return
		const paused = host.getState().pauseReasons.includes('manual')
		if (paused) host.resume()
		else host.pause()
		pause.setAttribute('aria-pressed', String(!paused))
		pause.textContent = paused ? 'Pause animation' : 'Resume animation'
	}
	pause?.addEventListener('click', onPause)
	mounted.set(root, {
		host,
		cleanup: () => pause?.removeEventListener('click', onPause)
	})
	await host.mount()
}

export const registerInteractiveScenes = (entries: SceneRegistration) => {
	for (const [id, definition] of Object.entries(entries)) {
		if (id !== definition.manifest.id) {
			throw new Error(`Scene registry key ${id} must match manifest id ${definition.manifest.id}.`)
		}
		const existing = registry.get(id)
		if (existing && existing !== definition) throw new Error(`Scene ${id} is already registered.`)
		registry.set(id, definition)
	}
	if (typeof document !== 'undefined') void mountInteractiveScenes()
}

export const mountInteractiveScenes = async(scope: ParentNode = document) => {
	await Promise.all(
		[...scope.querySelectorAll<HTMLElement>('[data-ooops-scene-root]')].map(mountRoot)
	)
}

export const destroyInteractiveScenes = async() => {
	const entries = [...mounted.entries()].reverse()
	mounted.clear()
	await Promise.all(entries.map(async([root, entry]) => {
		entry.cleanup()
		await entry.host.dispose()
		root.dataset.ooopsSceneState = 'disposed'
	}))
}

export const setInteractiveSceneMode = (
	target: HTMLElement | string,
	mode: SceneInteractionMode
) => {
	const root = typeof target === 'string'
		? document.querySelector<HTMLElement>(`[data-ooops-scene-root="${CSS.escape(target)}"]`)
		: target
	if (!root) return false
	mounted.get(root)?.host.setInteractionMode(mode)
	root.dataset.ooopsSceneMode = mode
	return true
}

export const installInteractiveScenes = () => {
	if (typeof document === 'undefined') return
	void mountInteractiveScenes()
	if (lifecycleInstalled) return
	lifecycleInstalled = true
	document.addEventListener('astro:before-swap', () => void destroyInteractiveScenes())
	document.addEventListener('astro:page-load', () => void mountInteractiveScenes())
	document.addEventListener('ooops:scene-mode', (event) => {
		const detail = (event as CustomEvent<{sceneId?: string; mode?: SceneInteractionMode}>).detail
		if (!detail || !['select', 'interact'].includes(String(detail.mode))) return
		if (detail.sceneId) setInteractiveSceneMode(detail.sceneId, detail.mode as SceneInteractionMode)
		else for (const root of mounted.keys()) {
			setInteractiveSceneMode(root, detail.mode as SceneInteractionMode)
		}
	})
}

export const getRegisteredInteractiveSceneIds = () => Object.freeze([...registry.keys()].sort())
