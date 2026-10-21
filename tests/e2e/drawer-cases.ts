import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

export function registerDrawerCases(adapter: 'astro' | 'svelte') {
	test('drawer guards dismissal, traps focus and restores its opener @critical', async({page}) => {
		await test.step('[FM-DRAWER/focus-and-guard]', async() => {
			await page.goto('/drawer')
			await expect(page.locator('html')).toHaveAttribute('data-drawer-ready', 'true')
			const opener = page.getByRole('button', {name: 'Edit details', exact: true})
			await opener.click()
			const panel = page.getByRole('dialog', {name: 'Edit details'})
			await expect(panel).toBeVisible()
			await expect(panel.getByRole('textbox', {name: 'Name'})).toBeFocused()
			await page.keyboard.press('Escape')
			await expect(panel).toBeVisible()
			if (adapter === 'svelte') {
				await panel.getByRole('button', {name: 'Attempt controlled close'}).click()
				await expect(panel).toBeVisible()
			}
			await panel.getByRole('button', {name: 'Close dialog'}).focus()
			await page.keyboard.press('Shift+Tab')
			await expect.poll(() =>
				panel.evaluate((node) => node.contains(document.activeElement))).toBe(true)
			const rect = await panel.boundingBox()
			expect(rect).not.toBeNull()
			expect(Math.abs(rect!.x + rect!.width - page.viewportSize()!.width)).toBeLessThanOrEqual(1)
			expect(rect!.height).toBe(page.viewportSize()!.height)
			const body = panel.locator('[data-part="body"]')
			expect(await body.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true)
			await expect(panel.getByText('Persistent footer')).toBeInViewport()
			expect((await new AxeBuilder({page}).include('dialog[open]').analyze()).violations).toEqual([])
			await panel.getByRole('button', {name: 'Allow dismissal'}).click()
			await page.keyboard.press('Escape')
			await expect(panel).not.toBeVisible()
			await expect(opener).toBeFocused()
		})
	})
	test('drawer logical sides, small viewport and busy dismissal @critical', async({page}) => {
		await test.step('[FM-DRAWER/layout-and-busy]', async() => {
			await page.setViewportSize({width: 393, height: 852})
			await page.goto('/drawer')
			await expect(page.locator('html')).toHaveAttribute('data-drawer-ready', 'true')
			await page.locator('html').evaluate((node) => { node.dir = 'rtl' })
			await page.getByRole('button', {name: 'Open start'}).click()
			const start = page.getByRole('dialog', {name: 'Start panel'})
			const startRect = await start.boundingBox()
			expect(startRect!.x + startRect!.width).toBe(393)
			await page.keyboard.press('Escape')
			await page.getByRole('button', {name: 'Open bottom'}).click()
			const bottom = await page.getByRole('dialog', {name: 'Bottom panel'}).boundingBox()
			expect(bottom!.y + bottom!.height).toBe(852)
			expect(bottom!.width).toBe(393)
			await page.keyboard.press('Escape')
			await page.getByRole('button', {name: 'Open busy'}).click()
			const saving = page.getByRole('dialog', {name: 'Saving details'})
			await expect(saving.getByRole('button', {name: 'Close dialog'})).toBeDisabled()
			await page.keyboard.press('Escape')
			await expect(saving).toBeVisible()
			if (adapter === 'svelte') {
				await saving.getByRole('button', {name: 'Finish saving'}).click()
				await page.keyboard.press('Escape')
				await expect(saving).not.toBeVisible()
			}
		})
	})
	if (adapter === 'svelte') test('open drawer teardown restores interaction outside', async({page}) => {
		await test.step('[FM-DRAWER/teardown]', async() => {
			await page.goto('/drawer')
			await page.getByRole('button', {name: 'Edit details', exact: true}).click()
			await page.getByRole('button', {name: 'Unmount drawer'}).click()
			await expect(page.locator('dialog[open]')).toHaveCount(0)
			await page.getByRole('button', {name: 'Open start'}).click()
			await expect(page.getByRole('dialog', {name: 'Start panel'})).toBeVisible()
		})
	})
}
