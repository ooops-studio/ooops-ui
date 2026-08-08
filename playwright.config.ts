import {defineConfig, devices} from '@playwright/test'

const critical = /@critical/

export default defineConfig({
	testDir: './tests',
	timeout: 45_000,
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['html', {open: 'never'}], ['list']] : 'list',
	use: {
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	expect: {
		toHaveScreenshot: {
			animations: 'disabled',
			maxDiffPixelRatio: 0.03
		}
	},
	snapshotPathTemplate: '{testDir}/visual/snapshots/{testFileName}/{projectName}/{platform}/{arg}{ext}',
	projects: [
		{
			name: 'primitives-chromium',
			testMatch: /browser\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4391'}
		},
		{
			name: 'primitives-firefox',
			testMatch: /browser\/.*\.spec\.ts/,
			use: {...devices['Desktop Firefox'], baseURL: 'http://127.0.0.1:4391'}
		},
		{
			name: 'primitives-webkit',
			testMatch: /browser\/.*\.spec\.ts/,
			use: {...devices['Desktop Safari'], baseURL: 'http://127.0.0.1:4391'}
		},
		{
			name: 'astro-chromium',
			testMatch: /e2e\/astro\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4392'}
		},
		{
			name: 'astro-firefox',
			testMatch: /e2e\/astro\/.*\.spec\.ts/,
			grep: critical,
			use: {...devices['Desktop Firefox'], baseURL: 'http://127.0.0.1:4392'}
		},
		{
			name: 'astro-webkit',
			testMatch: /e2e\/astro\/.*\.spec\.ts/,
			grep: critical,
			use: {...devices['Desktop Safari'], baseURL: 'http://127.0.0.1:4392'}
		},
		{
			name: 'svelte-chromium',
			testMatch: /e2e\/svelte\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4393'}
		},
		{
			name: 'svelte-firefox',
			testMatch: /e2e\/svelte\/.*\.spec\.ts/,
			grep: critical,
			use: {...devices['Desktop Firefox'], baseURL: 'http://127.0.0.1:4393'}
		},
		{
			name: 'svelte-webkit',
			testMatch: /e2e\/svelte\/.*\.spec\.ts/,
			grep: critical,
			use: {...devices['Desktop Safari'], baseURL: 'http://127.0.0.1:4393'}
		},
		{
			name: 'visual-astro-chromium',
			testMatch: /visual\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4392'}
		},
		{
			name: 'visual-svelte-chromium',
			testMatch: /visual\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4393'}
		},
		{
			name: 'stress-astro-chromium',
			testMatch: /stress\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4392'}
		},
		{
			name: 'stress-svelte-chromium',
			testMatch: /stress\/.*\.spec\.ts/,
			use: {...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4393'}
		}
	],
	webServer: [
		{
			command: 'corepack pnpm exec vite --force --host 127.0.0.1 --port 4391',
			url: 'http://127.0.0.1:4391/tests/browser/fixture.html',
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		},
		{
			command: 'corepack pnpm --filter @ooopsstudio/ui-e2e-astro exec astro preview --host 127.0.0.1 --port 4392',
			url: 'http://127.0.0.1:4392/',
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		},
		{
			command: 'corepack pnpm --filter @ooopsstudio/ui-e2e-sveltekit exec vite preview --host 127.0.0.1 --port 4393',
			url: 'http://127.0.0.1:4393/',
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		}
	]
})
