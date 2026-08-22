# @ooopsstudio/scene-gpu

Small, dependency-free WebGPU-first runtime for `@ooopsstudio/scene-core`, with deterministic
WebGL 2 startup fallback. Project shaders and visual behavior remain in the consuming scene.

```sh
pnpm add @ooopsstudio/scene-core @ooopsstudio/scene-gpu
```

```ts
import {defineGpuScene} from '@ooopsstudio/scene-gpu'

export const scene = defineGpuScene({
  manifest,
  webgpu: {
    async prepare({device, format}) {
      // Compile pipelines before the canvas commits to WebGPU.
      return {activate(context) {}, frame() {}, dispose() {}}
    }
  },
  webgl2: {
    setup({gl}) {
      return {frame() {}, dispose() {}}
    }
  }
})
```

The package owns backend negotiation, canvas sizing, device-loss reporting and hook lifecycle. It
does not ship shaders, a scene graph, asset loaders or a rendering engine.

Unless explicitly overridden, `low` quality requests `low-power`, `auto` leaves adapter selection
unbiased and `high` requests `high-performance`. A fixed preference or a per-quality map may be
passed through `powerPreference`.

## License

MIT
