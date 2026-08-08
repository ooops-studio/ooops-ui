export type MountedUi = {destroy: () => void}

const mounted = new Map<HTMLElement, MountedUi>()
const installers = new Map<string, (scope?: ParentNode) => void>()
let lifecycleInstalled = false

export const readUiConfig = <Config>(root: HTMLElement): Config => {
	const script = root.querySelector<HTMLScriptElement>(':scope > [data-ooops-ui-config]')
	if (!script?.textContent) throw new Error('Missing UI component configuration.')
	return JSON.parse(script.textContent) as Config
}

export const mountUiRoots = (
	selector: string,
	mount: (root: HTMLElement) => MountedUi | null,
	scope: ParentNode = document
) => {
	if (!installers.has(selector))
		installers.set(selector, (nextScope = document) => mountUiRoots(selector, mount, nextScope))
	for (const root of scope.querySelectorAll<HTMLElement>(selector)) {
		if (mounted.has(root)) continue
		const entry = mount(root)
		if (entry) mounted.set(root, entry)
	}
	if (!lifecycleInstalled) {
		lifecycleInstalled = true
		document.addEventListener('astro:before-swap', destroyMountedUi)
		document.addEventListener('astro:page-load', mountRegisteredUi)
	}
}

function mountRegisteredUi() {
	for (const install of installers.values()) install(document)
}

export const destroyMountedUi = () => {
	for (const [root, entry] of mounted) {
		entry.destroy()
		mounted.delete(root)
	}
}
