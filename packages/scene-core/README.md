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

Backing-store resolution adapts to the viewport and device DPR, with maximum pixel budgets of
1 MP for `low`, 2.25 MP for `auto` and 4 MP for `high` quality. This prevents 4K/high-DPR scenes
from allocating an unbounded canvas while keeping CSS layout unchanged.

## License

MIT
