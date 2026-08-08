import type {SceneViewport} from '@ooopsstudio/scene-core'
import {PerspectiveCamera} from 'three'

import type {ResponsivePerspectiveCameraOptions} from './types'

export const createResponsivePerspectiveCamera = (
	options: ResponsivePerspectiveCameraOptions = {}
) => {
	const camera = new PerspectiveCamera(
		options.fov ?? 45,
		1,
		options.near ?? 0.1,
		options.far ?? 100
	)
	const [x, y, z] = options.position ?? [0, 0, 4]
	camera.position.set(x, y, z)
	return camera
}

export const resizePerspectiveCamera = (
	camera: PerspectiveCamera,
	viewport: SceneViewport
) => {
	camera.aspect = viewport.height > 0 ? viewport.width / viewport.height : 1
	camera.updateProjectionMatrix()
}
