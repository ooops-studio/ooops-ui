import {svelte} from '@sveltejs/vite-plugin-svelte'
import {svelteTesting} from '@testing-library/svelte/vite'
import {defineConfig} from 'vitest/config'
export default defineConfig({plugins:[svelte(), svelteTesting()],
	resolve:{conditions:['browser']}, test:{environment:'jsdom', include:['test/**/*.test.ts'],
		maxWorkers:1, fileParallelism:false}})
