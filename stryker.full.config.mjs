import blockingConfig from './stryker.config.mjs'

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	...blockingConfig,
	mutate: [
		'packages/ui-primitives/src/{form-controls,layer,menu,multi-select,navigation,value-controls}.ts'
	],
	reporters: ['clear-text', 'progress', 'html', 'json'],
	thresholds: {
		high: 85,
		low: 70,
		break: null
	}
}
