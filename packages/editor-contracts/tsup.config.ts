import {defineConfig} from 'tsup'

export default defineConfig({
	entry: {index: 'src/index.ts'},
	format: ['esm'],
	platform: 'neutral',
	target: 'node22',
	dts: {resolve: true},
	sourcemap: true,
	clean: true,
	treeshake: true
})
