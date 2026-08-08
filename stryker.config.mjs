/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	plugins: [
		'@stryker-mutator/vitest-runner'
	],
	mutate: [
		'packages/ui-primitives/src/form-controls.ts:135-164',
		'packages/ui-primitives/src/form-controls.ts:178-185',
		'packages/ui-primitives/src/layer.ts:91-145',
		'packages/ui-primitives/src/menu.ts:81-97',
		'packages/ui-primitives/src/multi-select.ts:89-108',
		'packages/ui-primitives/src/multi-select.ts:157-161',
		'packages/ui-primitives/src/multi-select.ts:206-219',
		'packages/ui-primitives/src/value-controls.ts:53-66',
		'packages/ui-primitives/src/value-controls.ts:178-206'
	],
	testRunner: 'vitest',
	vitest: {
		configFile: 'packages/ui-primitives/vitest.config.ts',
		related: false
	},
	reporters: ['clear-text', 'progress', 'html', 'json'],
	coverageAnalysis: 'perTest',
	timeoutMS: 10_000,
	concurrency: 6,
	thresholds: {
		high: 85,
		low: 70,
		break: 70
	}
}
