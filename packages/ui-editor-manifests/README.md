# @ooopsstudio/ui-editor-manifests

Optional visual-editor metadata for Ooops UI components and scene adapters.

The core `@ooopsstudio/ui-primitives`, framework adapters and scene runtime do not depend on editor contracts. Install this package only in projects that expose those components to Ooops Editor.

```ts
import {uiComponentManifests} from '@ooopsstudio/ui-editor-manifests'
```

The manifests are framework-neutral, JSON-safe and validated by `@ooopsstudio/editor-contracts`.

Released under the MIT License.
