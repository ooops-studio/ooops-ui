import {svelte} from '@sveltejs/vite-plugin-svelte'
import {defineConfig, mergeConfig} from 'vitest/config'

import base from '../../vitest.config'

export default mergeConfig(base, defineConfig({
	plugins: [svelte()],
	resolve: {conditions: ['browser']},
	test: {
		environment: 'jsdom',
		passWithNoTests: true
	}
}))
