import {expect, test} from '@playwright/test'

import {expectNoAxeViolations, watchRuntimeErrors} from '../support'

test('@critical disabled projections, readonly clear and choice resets', async({page}, testInfo) => {
	const assertNoErrors = watchRuntimeErrors(page)
	await page.goto('/regressions')
	await page.getByRole('button', {name: 'Serialize controls'}).click()
	await expect(page.locator('#projection-output')).toHaveText('[]')
	await expect(page.locator('.ooops-input').getByRole('button', {name: 'Clear', exact: true})).toBeDisabled()
	await expect(page.locator('#readonly')).toHaveValue('Locked')
	await page.locator('#radio').getByLabel('Beta').check()
	await page.locator('#reset-segments').getByRole('radio', {name: 'Beta'}).click()
	await page.getByRole('button', {name: 'Serialize choices'}).click()
	await expect(page.locator('#choice-output')).toHaveText('[["plan","b"],["view","b"]]')
	await page.getByRole('button', {name: 'Reset choices'}).click()
	await expect(page.locator('#radio').getByLabel('Alpha')).toBeChecked()
	await expect(page.locator('#reset-segments').getByRole('radio', {name: 'Alpha'})).toHaveAttribute('aria-checked', 'true')
	await page.getByRole('button', {name: 'Serialize choices'}).click()
	await expect(page.locator('#choice-output')).toHaveText('[["plan","a"],["view","a"]]')
	await expectNoAxeViolations(page, testInfo)
	assertNoErrors()
})
