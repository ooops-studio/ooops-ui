# @ooopsstudio/scene-three

Three.js runtime for `@ooopsstudio/scene-core`, using `WebGPURenderer` with automatic WebGPU to
WebGL 2 fallback.

```sh
pnpm add @ooopsstudio/scene-core @ooopsstudio/scene-three three
pnpm add -D @types/three
```

```ts
import {defineThreeScene} from '@ooopsstudio/scene-three'

export const scene = defineThreeScene({
  manifest,
  setup({scene, camera}) {
    scene.add(camera)
  }
})
```

GLB/GLTF, textures, HDR and KTX2 assets use local project paths. Draco and KTX2 decoder paths
must be configured explicitly; no CDN is selected by the package. Raw GLSL remains possible in a
custom `scene-core` implementation, but first-party scenes should use TSL/Node Materials.

## License

MIT
