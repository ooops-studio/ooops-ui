import {defineConfig} from 'tsup'

export default defineConfig({
	entry: {index: 'src/index.ts', runtime: 'src/runtime.ts'},
	format: ['esm'],
	platform: 'browser',
	target: 'es2023',
	dts: {resolve: true},
	sourcemap: true,
	clean: true,
	splitting: false,
	treeshake: true,
	external: ['astro', '@ooopsstudio/scene-core']
})
