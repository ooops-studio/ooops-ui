# @ooopsstudio/scene-astro

Astro 7 markup and progressive enhancement for `@ooopsstudio/scene-core` definitions.

```sh
pnpm add @ooopsstudio/scene-core @ooopsstudio/scene-astro
```

Register explicit developer-owned implementations once:

```ts
import {registerInteractiveScenes} from '@ooopsstudio/scene-astro/runtime'
import {heroScene} from './hero-scene'

registerInteractiveScenes({hero: heroScene})
```

Then render the stable adapter:

```astro
---
import InteractiveScene from '@ooopsstudio/scene-astro/InteractiveScene.astro'
---
<InteractiveScene scene="hero" poster="/hero.webp" description="An abstract hero animation." />
```

Meaningful scenes require a description and pause control. Decorative scenes are hidden from the
accessibility tree. Scene implementations remain locked to the developer. Install
`@ooopsstudio/ui-editor-manifests` when explicit scene controls need to be exposed to visual-editor
tooling; this runtime adapter remains editor-independent.

## License

MIT
