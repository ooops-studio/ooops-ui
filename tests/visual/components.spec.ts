import {expect, test} from '@playwright/test'

const isAstro = (projectName: string) => projectName.includes('visual-astro')

test.beforeEach(async({page}) => {
	await page.goto('/')
})

test('desktop component surface', async({page}, testInfo) => {
	await expect(page.locator('main')).toHaveScreenshot(`${adapter(testInfo.project.name)}-desktop.png`)
})

test('mobile component surface', async({page}, testInfo) => {
	await page.setViewportSize({width: 390, height: 844})
	await expect(page.locator('main')).toHaveScreenshot(`${adapter(testInfo.project.name)}-mobile.png`)
})

test('RTL selection and layer surface', async({page}, testInfo) => {
	await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
	const triggerName = isAstro(testInfo.project.name) ? 'Actions' : 'Svelte actions'
	await page.getByRole('button', {name: triggerName, exact: true}).click()
	await expect(page.locator('[data-lab="overlays"]')).toHaveScreenshot(`${adapter(testInfo.project.name)}-rtl-layers.png`)
})

test('forced-colors form and dialog surface', async({page}, testInfo) => {
	await page.emulateMedia({forcedColors: 'active'})
	await page.getByRole('button', {name: 'Open dialog'}).click()
	await expect(page.getByRole('dialog', {name: 'Confirm action'})).toHaveScreenshot(`${adapter(testInfo.project.name)}-forced-colors-dialog.png`)
})

test('reduced-motion navigation surface', async({page}, testInfo) => {
	await page.emulateMedia({reducedMotion: 'reduce'})
	await expect(page.locator('[data-lab="navigation"]')).toHaveScreenshot(`${adapter(testInfo.project.name)}-reduced-motion-navigation.png`)
})

const adapter = (projectName: string) => (isAstro(projectName) ? 'astro' : 'svelte')
