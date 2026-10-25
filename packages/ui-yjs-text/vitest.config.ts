import {fileURLToPath} from 'node:url'

import {defineConfig} from 'vitest/config'

export default defineConfig({
	root: fileURLToPath(new URL('../..', import.meta.url)),
	test: {
		environment: 'node',
		maxWorkers: 1,
		include: ['packages/ui-yjs-text/test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['packages/ui-yjs-text/src/**/*.ts'],
			thresholds: {statements: 90, branches: 90, functions: 90, lines: 90}
		}
	}
})
