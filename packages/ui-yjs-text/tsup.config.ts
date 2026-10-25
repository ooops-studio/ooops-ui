import {defineConfig} from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	platform: 'neutral',
	target: 'node22',
	dts: true,
	sourcemap: true,
	clean: true,
	splitting: false,
	treeshake: true
})
