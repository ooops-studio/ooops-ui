import {expect, test} from '@playwright/test'

import {expectNoAxeViolations, watchRuntimeErrors} from '../support'

let assertNoRuntimeErrors: () => void

test.beforeEach(async({page}) => {
	assertNoRuntimeErrors = watchRuntimeErrors(page)
	await page.goto('/')
	await expect(page.getByRole('heading', {name: 'Astro component laboratory'})).toBeVisible()
})

test.afterEach(() => assertNoRuntimeErrors())

test('Field, Input and Textarea expose labels, slots and editing behavior', async({page}) => {
	await expect(page.getByTestId('astro-prefix')).toHaveText('@')
	await expect(page.getByTestId('astro-suffix')).toHaveText('.dev')
	await page.locator('[data-ooops-input-root]').filter({has: page.locator('#astro-name')}).getByRole('button', {name: 'Clear'}).click()
	await expect(page.locator('#astro-name')).toHaveValue('')
	await page.locator('#astro-password').fill('secret')
	await page.locator('[data-ooops-input-root]').filter({has: page.locator('#astro-password')}).getByRole('button', {name: 'Show or hide password'}).click()
	await expect(page.locator('#astro-password')).toHaveAttribute('type', 'text')
	await page.locator('#astro-bio').fill('Longer biography')
	await expect(page.locator('[data-ooops-textarea-root] [data-part="counter"]')).toHaveText('16/120')
	await expect(page.locator('#astro-invalid')).toHaveAttribute('aria-invalid', 'true')
	await expect(page.getByText('Invalid value')).toHaveAttribute('aria-live', 'polite')
})

test('@critical form controls serialize and reset native values', async({page}) => {
	await page.locator('#astro-field-control').fill('standalone')
	await page.locator('#astro-terms').check()
	await page.getByLabel('Pro').check()
	await page.locator('#astro-switch').check()
	await page.getByRole('radio', {name: 'List'}).click()
	await page.getByRole('button', {name: 'Submit Astro form'}).click()
	const output = page.locator('#astro-form-output')
	await expect(output).toContainText('standalone=standalone')
	await expect(output).toContainText('terms=on')
	await expect(output).toContainText('plan=pro')
	await expect(output).toContainText('notifications=on')
	await expect(output).toContainText('view=list')
	await page.getByRole('button', {name: 'Reset Astro form'}).click()
	await expect(page.locator('#astro-terms')).not.toBeChecked()
	await expect(page.getByLabel('Basic')).toBeChecked()
})

test('@critical Select, Combobox and MultiSelect support keyboard-only selection', async({page}) => {
	const select = page.locator('#astro-select-trigger')
	await select.focus()
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('Enter')
	await expect(page.locator('[data-ooops-select-root="astro-select"] select')).toHaveValue('it')

	const combo = page.locator('#astro-combobox')
	await combo.fill('Jap')
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('Enter')
	await expect(page.locator('[data-ooops-combobox-root] input[type="hidden"]')).toHaveValue('jp')

	const multi = page.locator('#astro-multi')
	await multi.fill('Code')
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('Enter')
	await expect(page.locator('[data-ooops-multi-select-root] [data-part="chip"]')).toContainText('Code')
	await expect(page.locator('input[name="tags"]')).toHaveValue('code')
})

test('@critical layers handle nested Escape and restore focus', async({page}) => {
	const menuTrigger = page.getByRole('button', {name: 'Actions', exact: true})
	await menuTrigger.click()
	const submenuTrigger = page.getByRole('menuitem', {name: 'More'})
	await expect(page.getByRole('menuitem', {name: 'Edit'})).toBeFocused()
	await page.keyboard.press('End')
	await expect(submenuTrigger).toBeFocused()
	await submenuTrigger.press('ArrowRight')
	await expect(page.getByRole('menu', {name: 'More'})).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('menu', {name: 'More'})).toBeHidden()
	await page.keyboard.press('Escape')
	await expect(menuTrigger).toBeFocused()

	const dialogTrigger = page.getByRole('button', {name: 'Open dialog'})
	await dialogTrigger.click()
	await expect(page.getByRole('dialog', {name: 'Confirm action'})).toBeVisible()
	await expect(page.getByRole('button', {name: 'Cancel'})).toBeFocused()
	await page.keyboard.press('Escape')
	await expect(dialogTrigger).toBeFocused()

	const modalTrigger = page.getByRole('button', {name: 'Open modal'})
	await modalTrigger.click()
	await expect(page.getByRole('dialog', {name: 'Modal title'})).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(modalTrigger).toBeFocused()
})

test('Tooltip and Popover expose dismissal and focus behavior', async({page}) => {
	await page.locator('#astro-tooltip-trigger').focus()
	await expect(page.getByRole('tooltip')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('tooltip')).toBeHidden()

	const trigger = page.getByRole('button', {name: 'Open popover'})
	await trigger.click()
	await expect(page.getByRole('dialog', {name: 'Astro popover'})).toBeVisible()
	await expect(page.locator('#astro-popover-action')).toBeFocused()
	await page.keyboard.press('Escape')
	await expect(trigger).toBeFocused()
})

test('@critical Tabs, Accordion, NumberInput, Slider and Part update state', async({page}) => {
	const tabs = page.locator('#astro-tabs')
	await tabs.getByRole('tab', {name: 'Overview'}).focus()
	await page.keyboard.press('ArrowRight')
	await expect(tabs.getByRole('tab', {name: 'Details'})).toHaveAttribute('aria-selected', 'true')
	await expect(tabs.getByRole('tabpanel', {name: 'Details'})).toBeVisible()

	await page.getByRole('button', {name: 'First section'}).click()
	await page.getByRole('button', {name: 'Second section'}).click()
	await expect(page.getByRole('button', {name: 'First section'})).toHaveAttribute('aria-expanded', 'true')
	await expect(page.getByRole('button', {name: 'Second section'})).toHaveAttribute('aria-expanded', 'true')

	await page.getByRole('button', {name: 'Increase'}).click()
	await expect(page.locator('#astro-number')).toHaveValue('3')
	const firstThumb = page.locator('#astro-slider [data-part="thumb"]').first()
	await firstThumb.focus()
	await page.keyboard.press('ArrowRight')
	await expect(firstThumb).toHaveAttribute('aria-valuenow', '25')
	await expect(page.getByTestId('astro-part')).toHaveAttribute('data-state', 'ready')
	await expect(page.getByTestId('astro-part')).toHaveAttribute('data-selected', 'true')
})

test('@critical Astro view transitions clean portals and remount once', async({page}) => {
	await page.getByRole('button', {name: 'Open popover'}).click()
	await expect(page.locator('[data-ooops-popover-panel="astro-popover"]')).toBeVisible()
	await Promise.all([
		page.waitForURL((url) => /^\/transition\/?$/.test(url.pathname)),
		page.locator('#popover-transition-link').click()
	])
	await expect(page.locator('#transition-marker')).toBeVisible()
	await expect(page.locator('[data-ooops-popover-panel="astro-popover"]')).toHaveCount(0)
	await Promise.all([
		page.waitForURL((url) => url.pathname === '/'),
		page.getByRole('link', {name: 'Return to components'}).click()
	])
	await expect(page.getByRole('heading', {name: 'Astro component laboratory'})).toBeVisible()
	await page.getByRole('button', {name: 'Open popover'}).click()
	await expect(page.locator('[data-ooops-popover-panel="astro-popover"]')).toHaveCount(1)
	await expect(page.getByRole('button', {name: 'Open popover'})).toHaveAttribute('aria-expanded', 'true')
})

test('has no axe violations in base, validation and open-layer states', async({page}, testInfo) => {
	await expectNoAxeViolations(page, testInfo)
	await page.getByRole('button', {name: 'Open dialog'}).click()
	await expectNoAxeViolations(page, testInfo)
	await page.keyboard.press('Escape')
	await page.getByRole('button', {name: 'Actions', exact: true}).click()
	await expectNoAxeViolations(page, testInfo)
})
