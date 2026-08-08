import {Material, Object3D, Texture} from 'three'

export type ThreeTrackedResource =
	| Object3D
	| Texture
	| {dispose: () => void}
	| null
	| undefined

export type ThreeResourceTracker = {
	track: <Value extends ThreeTrackedResource>(resource: Value) => Value
	untrack: (resource: ThreeTrackedResource) => void
	dispose: () => void
}

const disposeMaterial = (material: Material) => {
	for (const value of Object.values(material)) {
		if (value instanceof Texture) value.dispose()
	}
	material.dispose()
}

const disposeResource = (resource: ThreeTrackedResource) => {
	if (!resource) return
	if (resource instanceof Object3D) {
		resource.traverse((object) => {
			const candidate = object as Object3D & {
				geometry?: {dispose?: () => void}
				material?: Material | Material[]
			}
			candidate.geometry?.dispose?.()
			if (Array.isArray(candidate.material)) candidate.material.forEach(disposeMaterial)
			else if (candidate.material) disposeMaterial(candidate.material)
		})
		resource.removeFromParent()
		return
	}
	resource.dispose()
}

export const createThreeResourceTracker = (): ThreeResourceTracker => {
	const resources = new Set<ThreeTrackedResource>()
	let disposed = false
	return {
		track(resource) {
			if (disposed) throw new Error('Three resource tracker is disposed.')
			if (resource) resources.add(resource)
			return resource
		},
		untrack: (resource) => resources.delete(resource),
		dispose() {
			if (disposed) return
			disposed = true
			for (const resource of [...resources].reverse()) disposeResource(resource)
			resources.clear()
		}
	}
}
