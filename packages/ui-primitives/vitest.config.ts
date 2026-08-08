import {fileURLToPath} from 'node:url'

import {defineConfig} from 'vitest/config'

export default defineConfig({
	root: fileURLToPath(new URL('../..', import.meta.url)),
	test: {
		environment: 'node',
		include: ['packages/ui-primitives/test/**/*.test.ts'],
		passWithNoTests: true,
		coverage: {
			provider: 'v8',
			include: ['packages/ui-primitives/src/**/*.ts'],
			exclude: [
				'**/*.d.ts',
				'**/*.{test,spec}.{ts,tsx}',
				'**/__tests__/**'
			],

			thresholds: {
				perFile: true,
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90
			}
		}
	}
})
