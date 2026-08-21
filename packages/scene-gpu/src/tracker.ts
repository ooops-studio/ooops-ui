import type {GpuResource, GpuResourceTracker} from './types'

const disposeResource = (resource: Exclude<GpuResource, null | undefined>) => {
	if (typeof resource === 'function') resource()
	else if ('destroy' in resource) resource.destroy()
	else resource.dispose()
}

export const createGpuResourceTracker = (): GpuResourceTracker => {
	const resources = new Set<Exclude<GpuResource, null | undefined>>()
	let disposed = false
	return {
		track(resource) {
			if (disposed) throw new Error('GPU resource tracker is disposed.')
			if (resource) resources.add(resource)
			return resource
		},
		untrack(resource) {
			if (resource) resources.delete(resource)
		},
		dispose() {
			if (disposed) return
			disposed = true
			for (const resource of [...resources].reverse()) disposeResource(resource)
			resources.clear()
		}
	}
}
