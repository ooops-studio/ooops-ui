import {defineConfig} from 'tsup'

export default defineConfig({
	entry: {index: 'src/index.ts'},
	format: ['esm'],
	platform: 'neutral',
	target: 'es2023',
	dts: {resolve: true},
	sourcemap: true,
	clean: true,
	treeshake: true,
	external: ['@ooopsstudio/editor-contracts']
})
