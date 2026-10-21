import {expect, test} from '@playwright/test'

test('async Combobox navigation destroys controller and aborts loader @critical', async({page}) => {
	await page.goto('/tests/browser/fixture.html')
	const before = await page.evaluate(async() => {
		const source = '/packages/ui-primitives/dist/index.js'
		const {createComboboxController} = await import(source)
		const root = document.createElement('div')
		root.innerHTML = '<input aria-label="Async test"><div role="listbox"></div>'
		document.body.append(root)
		let aborted = 0
		const controller = createComboboxController({debounceMs: 0, portal: false,
			getRoot: () => root, getInput: () => root.querySelector('input'),
			getListbox: () => root.querySelector('[role="listbox"]'), getOptions: () => [],
			loadOptions: (_query: string, {signal}: {signal: AbortSignal}) => new Promise((resolve) => {
				signal.addEventListener('abort', () => {
					aborted++
					resolve([{value: 'late', label: 'Late result'}])
				}, {once: true})
			})})
		controller.mount()
		controller.setQuery('pending')
		window.addEventListener('pagehide', () => {
			controller.destroy()
			root.remove()
			sessionStorage.setItem('feature-async-teardown', JSON.stringify({
				state: controller.getState(), aborted, detached: !root.isConnected
			}))
		}, {once: true})
		return {mounted: controller.getState().mounted, loading: controller.getState().loading}
	})
	expect(before).toEqual({mounted: true, loading: true})
	await page.goto('/tests/browser/fixture.html?after-cleanup')
	const after = JSON.parse(await page.evaluate(() => sessionStorage.getItem('feature-async-teardown') ?? 'null'))
	await test.step('[FM-ASYNC-UNMOUNT/navigation-unmount]', async() => {
		expect(after.detached).toBe(true)
		expect(after.state.mounted).toBe(false)
	})
	await test.step('[FM-ASYNC-UNMOUNT/abort-signal]', async() => { expect(after.aborted).toBe(1) })
	await test.step('[FM-ASYNC-UNMOUNT/pending-cleanup]', async() => { expect(after.state.loading).toBe(false) })
})
