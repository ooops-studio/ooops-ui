# @ooopsstudio/editor-contracts

Shared versioned contracts for component, accessibility, template, design-token and interactive-scene metadata consumed by Ooops Studio tooling.

## Installation

```sh
pnpm add @ooopsstudio/editor-contracts
```

## Usage

```ts
import {parseComponentManifest} from '@ooopsstudio/editor-contracts'

const result = parseComponentManifest(input)
if (!result.ok) console.error(result.issues)
```

Successful parse results are cloned and deeply frozen. Validators never execute metadata and reject unsafe keys, duplicate identifiers, unsupported CSS properties and unknown schema versions.

Component parts declare controlled positioning separately from general style properties. Manifests list allowed position modes, logical inset controls, responsive support and semantic z-index tokens. Runtime-owned overlay layers can declare their modes while keeping positioning locked. Arbitrary z-index values are disabled by default and require explicit bounded integer ranges when enabled.

Checked-in JSON Schemas are available from the `./schemas/*` package exports for non-JavaScript consumers.

Interactive scenes are developer-owned runtime components with locked internals. Their manifests expose
only explicit controls, local assets, bounded input capabilities, quality choices and deterministic
fallbacks through `parseInteractiveSceneManifest()` and `schemas/scene.json`.

## License

MIT
