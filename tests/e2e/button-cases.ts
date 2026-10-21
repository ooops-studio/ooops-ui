import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

import {watchRuntimeErrors} from './support'

export function registerButtonCases(adapter: 'astro' | 'svelte') {
	const destination = adapter === 'astro' ? '/transition' : '/cleanup'
	let noErrors: () => void
	test.beforeEach(async({page}) => {
		noErrors = watchRuntimeErrors(page)
		await page.goto('/buttons')
		await expect(page.locator('#ready')).toHaveText('ready')
	})
	test.afterEach(() => noErrors())
	test('buttons preserve native form validation, submitter data and DOM events @critical', async({page}) => {
		await test.step('[FM-BUTTON-ACTIONS/native-form]', async() => {
			await expect(page.locator('#plain')).toHaveAttribute('type', 'button')
			await page.getByRole('button', {name: 'Plain action'}).click()
			await expect(page.locator('#clicks')).toHaveText('1')
			await expect(page.locator('#submits')).toHaveText('0')
			await page.getByRole('button', {name: 'Submit record'}).click()
			await expect(page.locator('#email')).toBeFocused()
			await expect(page.locator('#submits')).toHaveText('0')
			await page.locator('#email').fill('ada@example.test')
			await page.getByRole('button', {name: 'Submit record'}).click()
			await expect(page.locator('#submits')).toHaveText('1')
			await expect(page.locator('#submitted')).toHaveText('save')
		})
		await test.step('[FM-BUTTON-ACTIONS/accessible-name]', async() => {
			await expect(page.locator('#refresh')).toHaveAccessibleName('Refresh results')
		})
		await page.getByRole('button', {name: 'Refresh results', exact: true}).click()
		await expect(page.locator('#clicks')).toHaveText('2')
	})

	test('disabled and loading controls cannot activate; enabled links navigate @critical', async({page}) => {
		await test.step('[FM-BUTTON-ACTIONS/disabled-loading]', async() => {
			await expect(page.locator('#disabled')).toBeDisabled()
			await expect(page.getByRole('button', {name: 'Saving record'})).toBeDisabled()
			await expect(page.locator('#busy')).toHaveAttribute('aria-busy', 'true')
			for (const id of ['blocked-link', 'busy-link']) {
				const link = page.locator(`#${id}`)
				await expect(link).toHaveAttribute('aria-disabled', 'true')
				await expect(link).not.toHaveAttribute('href')
				await expect(link).toHaveAttribute('tabindex', '-1')
				const allowed = await link.evaluate((element) =>
					element.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})))
				expect(allowed).toBe(false)
			}
			await expect(page.locator('#clicks')).toHaveText('0')
			await page.locator('#unlock').click()
			await expect(page.locator('#disabled')).toBeEnabled()
			await expect(page.locator('#busy')).toBeEnabled()
			await expect(page.locator('#busy')).not.toHaveAttribute('aria-busy')
			await expect(page.locator('#blocked-link')).toHaveAttribute('href', destination)
			await page.locator('#blocked-link').click()
			await expect(page).toHaveURL(new RegExp(`${destination}$`))
		})
	})

	test('button SSR remains safe without JavaScript and icon names are accessible', async({browser, baseURL, page}) => {
		const context = await browser.newContext({javaScriptEnabled: false, baseURL})
		try {
			const native = await context.newPage()
			await native.goto('/buttons')
			await expect(native.getByRole('button', {name: 'Refresh results'})).toBeVisible()
			await expect(native.locator('#plain')).toHaveAttribute('type', 'button')
			await expect(native.locator('#busy')).toBeDisabled()
			await expect(native.locator('#blocked-link')).not.toHaveAttribute('href')
			await expect(native.locator('#busy-link')).not.toHaveAttribute('href')
			await expect(native.locator('#passive-busy')).toHaveAttribute('aria-busy', 'true')
			await expect(native.locator('#passive-busy')).toHaveAttribute('aria-disabled', 'true')
			expect(await native.locator('#passive-busy').evaluate((node: HTMLButtonElement) => node.disabled)).toBe(false)
		} finally { await context.close() }
		await expect(page.locator('#passive-busy')).toHaveAttribute('aria-busy', 'true')
		await expect(page.locator('#passive-busy')).toHaveAttribute('aria-disabled', 'true')
		expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
	})

	if (adapter === 'svelte') test('button refs follow native tag replacement and clear on teardown @critical', async({page}) => {
		await test.step('[FM-BUTTON-ACTIONS/refs]', async() => {
			await expect(page.locator('#reference-state')).toHaveText('BUTTON|BUTTON')
			await page.locator('#switch-tag').click()
			await expect(page.locator('#reference-state')).toHaveText('A|BUTTON')
			await expect(page.locator('#reference')).toHaveAttribute('href', destination)
			await page.locator('#remove').click()
			await expect(page.locator('#reference-state')).toHaveText('none|BUTTON')
			await page.locator('#remove-icon').click()
			await expect(page.locator('#reference-state')).toHaveText('none|none')
		})
	})
}
