import AxeBuilder from '@axe-core/playwright'
import {test, expect} from '@playwright/test'
test('@critical searchable multi select keyboard, creation and accessible results', async({page}) => {
	await test.step('[FM-SEARCHABLE-MULTI/keyboard-create]', async() => {
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		await page.goto('/searchable-multi')
		const region = page.getByRole('region', {name: 'Searchable members'})
		const input = region.getByRole('combobox', {name: 'Members'})
		await input.fill('code')
		await expect(region.getByRole('option')).toHaveCount(1)
		await input.press('ArrowDown')
		await expect(region.getByRole('option', {name: 'Code', exact: true})).toBeFocused()
		await page.keyboard.press('Enter')
		await expect(region.getByLabel('Selected members')).toHaveText('code')
		await input.click()
		await expect(region.getByRole('option', {name: 'Code', exact: true})).toHaveCount(0)
		await input.fill('new member')
		await input.press('Enter')
		await expect(region.getByLabel('Created member')).toHaveText('new member')
		await region.getByRole('button', {name: 'Remove Code'}).click()
		await expect(region.getByLabel('Selected members')).toBeEmpty()
		await input.click()
		const results = await new AxeBuilder({page}).include('[aria-label="Searchable members"]').analyze()
		expect(results.violations).toEqual([])
		expect(errors).toEqual([])
	})
})
