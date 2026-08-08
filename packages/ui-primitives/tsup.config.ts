// packages/demo/tsup.config.ts
import {defineConfig} from 'tsup'

export default defineConfig({
	entry: {'index': 'src/index.ts', 'editor': 'src/editor.ts'},
	format: ['esm'],
	platform: 'neutral',
	target: 'node22',
	dts: {resolve: true},
	sourcemap: true,
	clean: true,
	splitting: false,
	treeshake: true,
	minify: false
})
