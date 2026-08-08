import {expect, test} from '@playwright/test'

import {watchRuntimeErrors} from '../support'

let assertNoRuntimeErrors: () => void

test.beforeEach(async({page}) => {
	assertNoRuntimeErrors = watchRuntimeErrors(page)
	await page.goto('/')
	await expect(page.locator('#hydration-status')).toHaveAttribute('data-hydrated', 'true')
})

test.afterEach(() => assertNoRuntimeErrors())

test('[FM-CHECKBOX-TRANSITIONS] reactive indeterminate and disabled @critical', async({page}) => {
	const mixed = page.locator('#svelte-mixed')
	const disabled = page.locator('#svelte-disabled-check')
	await expect(mixed).toHaveAttribute('aria-checked', 'mixed')
	await expect(disabled).toBeDisabled()
	await page.locator('#toggle-checkbox-state').click()
	await expect(mixed).toHaveAttribute('aria-checked', 'false')
	await expect(disabled).toBeEnabled()
	await disabled.focus()
	await disabled.press('Space')
	await expect(disabled).toBeChecked()
})

test('[FM-MULTISELECT-BOUNDS] max/select-all/clear/chip removal @critical', async({page}) => {
	const input = page.locator('#svelte-multi-input')
	await input.focus()
	const listbox = page.locator('#svelte-multi-listbox')
	await listbox.getByRole('button', {name: 'Select all'}).click()
	const chips = page.locator('[data-part="root"]').filter({has: input}).locator('[data-part="chip"]')
	await expect(chips).toHaveCount(2)
	await input.focus()
	await input.press('Backspace')
	await expect(chips).toHaveCount(1)
	await listbox.getByRole('button', {name: 'Clear'}).click()
	await expect(chips).toHaveCount(0)
})

test('[FM-MENU-BRANCHES] typeahead/items/RTL @critical', async({page}) => {
	await page.getByRole('button', {name: 'Svelte actions', exact: true}).click()
	const setting = page.getByRole('menuitemcheckbox', {name: 'Setting'})
	await setting.focus()
	await setting.press('Space')
	await expect(setting).toHaveAttribute('aria-checked', 'false')
	await setting.press('c')
	const compact = page.getByRole('menuitemradio', {name: 'Compact'})
	await expect(compact).toBeFocused()
	await compact.press('ArrowDown')
	const comfortable = page.getByRole('menuitemradio', {name: 'Comfortable'})
	await expect(comfortable).toBeFocused()
	await comfortable.press('Space')
	await expect(comfortable).toHaveAttribute('aria-checked', 'true')
	await expect(compact).toHaveAttribute('aria-checked', 'false')
	await page.keyboard.press('Escape')
	await expect(page.getByRole('button', {name: 'Svelte actions', exact: true})).toHaveAttribute('aria-expanded', 'false')

	const rtlTrigger = page.getByRole('button', {name: 'RTL actions', exact: true})
	await rtlTrigger.click()
	await expect(rtlTrigger).toHaveAttribute('aria-expanded', 'true')
	const rtlSubmenu = page.getByRole('menuitem', {name: 'More RTL'})
	await rtlSubmenu.focus()
	await rtlSubmenu.press('ArrowLeft')
	await expect(page.getByRole('menu', {name: 'More RTL'})).toBeVisible()
})

test('[FM-TOOLTIP-POINTER] hover delay, close delay, coarse pointer, and focus fallback work', async({page}) => {
	const trigger = page.locator('#svelte-tooltip-delayed-trigger')
	const tooltip = page.getByRole('tooltip', {name: 'Delayed Svelte context'})
	await trigger.hover()
	await page.waitForTimeout(80)
	await expect(tooltip).toBeHidden()
	await page.waitForTimeout(130)
	await expect(tooltip).toBeVisible()
	await page.mouse.move(0, 0)
	await page.waitForTimeout(60)
	await expect(tooltip).toBeVisible()
	await page.waitForTimeout(90)
	await expect(tooltip).toBeHidden()
	await page.evaluate(() => {
		const original = window.matchMedia.bind(window)
		window.matchMedia = (query: string) =>
			query === '(pointer: coarse)'
				? ({
					matches: true, media: query, onchange: null,
					addListener() {}, removeListener() {},
					addEventListener() {}, removeEventListener() {},
					dispatchEvent: () => false
				} as MediaQueryList)
				: original(query)
		document.querySelector('#svelte-tooltip-delayed-trigger')
			?.dispatchEvent(new PointerEvent('pointerenter', {bubbles: true, pointerType: 'mouse'}))
	})
	await page.waitForTimeout(220)
	await expect(tooltip).toBeHidden()
	await trigger.focus()
	await page.waitForTimeout(200)
	await expect(tooltip).toBeVisible()
})

test('[FM-LAYER-COLLISION] layers flip and shift at real viewport edges', async({page}) => {
	await page.goto('/edges')
	await page.getByRole('button', {name: 'Bottom edge'}).click()
	const bottom = page.getByRole('dialog', {name: 'Bottom edge panel'})
	await expect(bottom).toHaveAttribute('data-placement', 'top')
	await expectInsideViewport(bottom)
	await page.keyboard.press('Escape')
	await page.getByRole('button', {name: 'Top edge'}).click()
	const top = page.getByRole('dialog', {name: 'Top edge panel'})
	await expect(top).toHaveAttribute('data-placement', 'bottom')
	await expectInsideViewport(top)
})

test('[FM-DIALOG-NESTED] focus cycle/nested Escape/restore @critical', async({page}) => {
	const outerTrigger = page.getByRole('button', {name: 'Open dialog'})
	await outerTrigger.click()
	const cancel = page.getByRole('button', {name: 'Cancel'})
	await expect(cancel).toBeFocused()
	const nestedTrigger = page.getByRole('button', {name: 'Open nested modal'})
	const confirm = page.getByRole('button', {name: 'Confirm'})
	await confirm.focus()
	await confirm.press('Tab')
	await expect(nestedTrigger).toBeFocused()
	await nestedTrigger.press('Shift+Tab')
	await expect(confirm).toBeFocused()
	await nestedTrigger.click()
	await expect(page.getByRole('dialog', {name: 'Nested modal'})).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(nestedTrigger).toBeFocused()
	await expect(page.getByRole('dialog', {name: 'Confirm action'})).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(outerTrigger).toBeFocused()
})

test('[FM-TABS-MODES] manual activation separates focus from selection and navigation uses links', async({page}) => {
	const manual = page.locator('#svelte-tabs-manual')
	const first = manual.getByRole('tab', {name: 'Manual first'})
	const second = manual.getByRole('tab', {name: 'Manual second'})
	await first.focus()
	await first.press('ArrowRight')
	await expect(second).toBeFocused()
	await expect(first).toHaveAttribute('aria-selected', 'true')
	await expect(second).toHaveAttribute('aria-selected', 'false')
	await second.press('Space')
	await expect(second).toHaveAttribute('aria-selected', 'true')
	const navigation = page.locator('#svelte-navigation-tabs')
	await expect(navigation.getByRole('link', {name: 'Home'})).toHaveAttribute('aria-current', 'page')
	await expect(navigation.locator('[role="tab"]')).toHaveCount(0)
})

test('[FM-SLIDER-KEYBOARD] Home/End/Page/collision/RTL @critical', async({page}) => {
	const thumbs = page.locator('#svelte-slider [role="slider"]')
	const low = thumbs.nth(0)
	const high = thumbs.nth(1)
	await low.focus()
	await low.press('End')
	await expect(low).toHaveAttribute('aria-valuenow', '75')
	await expect(high).toHaveAttribute('aria-valuenow', '80')
	await high.press('PageUp')
	await expect(high).toHaveAttribute('aria-valuenow', '100')
	await high.press('Home')
	await expect(high).toHaveAttribute('aria-valuenow', '80')
	const rtl = page.locator('#svelte-slider-rtl [role="slider"]')
	await rtl.focus()
	await rtl.press('ArrowRight')
	await expect(rtl).toHaveAttribute('aria-valuenow', '49')
})

test('[FM-NUMBER-INTERMEDIATE] invalid intermediate text remains editable and finite values clamp on blur', async({page}) => {
	const input = page.locator('#svelte-number')
	await input.fill('12')
	await expect(input).toHaveAttribute('aria-invalid', 'true')
	await input.blur()
	await expect(input).toHaveValue('5')
	await input.fill('')
	await expect(input).toHaveValue('')
})

test('[FM-TEXTAREA-GEOMETRY] auto-resize grows to max rows and then enables scrolling', async({page}) => {
	const textarea = page.locator('#svelte-bio')
	const initial = await textarea.evaluate((element) => element.getBoundingClientRect().height)
	await textarea.fill('one\ntwo\nthree\nfour\nfive\nsix')
	const geometry = await textarea.evaluate((element) => ({
		height: element.getBoundingClientRect().height,
		overflowY: getComputedStyle(element).overflowY,
		lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) || 20
	}))
	expect(geometry.height).toBeGreaterThan(initial)
	expect(geometry.height).toBeLessThanOrEqual(geometry.lineHeight * 4 + 8)
	expect(geometry.overflowY).toBe('auto')
})

test('[FM-ASYNC-UNMOUNT] aborts load and clears pending work @critical', async({page}) => {
	const input = page.locator('#svelte-async-combobox-input')
	await input.fill('navigate')
	await expect(page.locator('[data-part="root"]').filter({has: input})).toHaveAttribute('data-loading', 'true')
	await Promise.all([
		page.waitForURL((url) => url.pathname === '/cleanup'),
		page.locator('#cleanup-link').click()
	])
	await expect(page.locator('#async-pending')).toHaveText('pending:0')
	await expect(page.locator('#async-aborted')).toHaveText('aborted:1')
})

const expectInsideViewport = async(locator: import('@playwright/test').Locator) => {
	const bounds = await locator.boundingBox()
	expect(bounds).not.toBeNull()
	const viewport = locator.page().viewportSize()
	expect(viewport).not.toBeNull()
	expect(bounds!.x).toBeGreaterThanOrEqual(0)
	expect(bounds!.y).toBeGreaterThanOrEqual(0)
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width)
	expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height)
}
