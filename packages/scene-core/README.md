# @ooopsstudio/scene-core

Renderer-neutral lifecycle and resource coordination for interactive canvas scenes.

```sh
pnpm add @ooopsstudio/scene-core
```

```ts
import {createSceneHost, defineInteractiveScene} from '@ooopsstudio/scene-core'

const scene = defineInteractiveScene({
  manifest,
  create: () => ({
    mount({canvas}) {
      const context = canvas.getContext('2d')
      context?.fillRect(0, 0, canvas.width, canvas.height)
    }
  })
})

const host = createSceneHost({element, canvas, definition: scene, config: {color: 'red'}})
await host.mount()
```

The host owns scheduling, resize, visibility, reduced-motion handling, interaction-mode gating and
cleanup. Camera and microphone capture are intentionally unsupported; audio input must be an
explicit caller-owned media element.

Backing-store resolution adapts to the viewport and device DPR. Fixed `low` and `high` quality
tiers use maximum pixel budgets of 1 MP and 4 MP. `auto` starts at 2.25 MP, observes sustained
animation-frame cadence, and moves between 1.25 MP and 4 MP with separate downscale/upscale
thresholds. This prevents 4K/high-DPR scenes from allocating an unbounded canvas while allowing
smooth devices to recover more detail without changing CSS layout.

## License

MIT
