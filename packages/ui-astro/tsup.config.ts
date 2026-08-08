import {defineConfig} from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'runtime/forms': 'src/runtime/forms.ts',
		'runtime/selections': 'src/runtime/selections.ts',
		'runtime/navigation': 'src/runtime/navigation.ts',
		'runtime/overlays': 'src/runtime/overlays.ts'
	},
	format: ['esm'],
	platform: 'neutral',
	target: 'es2023',
	dts: {resolve: true},
	sourcemap: true,
	clean: true,
	splitting: false,
	treeshake: true,
	minify: false,
	external: ['astro', '@ooopsstudio/ui-primitives']
})
