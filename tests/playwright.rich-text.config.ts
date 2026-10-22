import {fileURLToPath} from 'node:url'

import {defineConfig} from '@playwright/test'
const evidence = process.env.OOOPS_RICH_TEXT_EVIDENCE ?? '/tmp/ooops-rich-text/library-browser'
export default defineConfig({
	testDir: './e2e/svelte', testMatch: 'rich-text.spec.ts', workers: 1, retries: 0,
	timeout: 60_000, expect: {timeout: 15_000}, outputDir: `${evidence}/results`,
	reporter: [['list'], ['json', {outputFile: `${evidence}/results.json`}]],
	use: {baseURL: 'http://127.0.0.1:4397', headless: true, trace: 'retain-on-failure'},
	projects: (['chromium', 'firefox', 'webkit'] as const).map((browserName) => ({name: browserName, use: {browserName}})),
	webServer: {cwd: fileURLToPath(new URL('../', import.meta.url)), command: 'pnpm --filter @ooopsstudio/ui-e2e-sveltekit exec vite preview --host 127.0.0.1 --port 4397',
		url: 'http://127.0.0.1:4397/rich-text', reuseExistingServer: false, timeout: 60_000}
})
