import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

test.beforeEach(async({page}) => { await page.goto('/tests/browser/fixture.html') })

test('form validation focuses the first invalid field and submits valid data', async({page}) => {
	await page.getByRole('button', {name: 'Submit'}).click()
	await expect(page.locator('#name')).toBeFocused()
	await expect(page.locator('#name-error')).toHaveText('This field is required.')
	await page.locator('#name').fill('Ada')
	await page.keyboard.press('Enter')
	await expect(page.locator('#result')).toHaveText('submitted:Ada')
})

test('combobox and multi-select support keyboard-only selection', async({page}) => {
	await page.locator('#country').focus()
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('Enter')
	await expect(page.locator('#country-value')).toHaveValue('gr')
	await page.locator('#tags').focus()
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('Enter')
	await expect(page.locator('#result')).toHaveText('tags:code')
})

test('menu, tabs, accordion and dual slider expose expected keyboard state', async({page}) => {
	await page.locator('#menu-trigger').click()
	await expect(page.locator('#menu')).toBeVisible()
	await page.getByRole('menuitem', {name: 'More'}).focus()
	await page.keyboard.press('ArrowRight')
	await expect(page.getByRole('menu', {name: 'More actions'})).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('menu', {name: 'More actions'})).toBeHidden()
	await expect(page.locator('#menu')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.locator('#menu')).toBeHidden()
	await page.locator('[role="tab"]').first().focus()
	await page.keyboard.press('ArrowRight')
	await expect(page.locator('[role="tab"]').nth(1)).toHaveAttribute('aria-selected', 'true')
	await page.locator('[data-accordion-trigger]').click()
	await expect(page.locator('[data-accordion-trigger]')).toHaveAttribute('aria-expanded', 'true')
	await page.locator('[role="slider"]').first().focus()
	await page.keyboard.press('ArrowRight')
	await expect(page.locator('[role="slider"]').first()).toHaveAttribute('aria-valuenow', '21')
})

test('tooltip dismisses and dialog restores focus', async({page}) => {
	await page.locator('#tooltip-trigger').focus()
	await expect(page.locator('#tooltip')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.locator('#tooltip')).toBeHidden()
	await page.locator('#dialog-trigger').click()
	await expect(page.locator('#dialog-close')).toBeFocused()
	await page.keyboard.press('Escape')
	await expect(page.locator('#dialog')).toBeHidden()
	await expect(page.locator('#dialog-trigger')).toBeFocused()
})

test('fixture has no automatically detectable accessibility violations', async({page}) => {
	const results = await new AxeBuilder({page}).analyze()
	expect(results.violations).toEqual([])
})
