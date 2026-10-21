import {expect, test, type Locator} from '@playwright/test'

import {watchRuntimeErrors} from './support'

const branch = (feature: string, name: string, check: () => Promise<unknown>) =>
	test.step(`[${feature}/${name}]`, check)

export function registerBehaviorCases(adapter: 'astro' | 'svelte') {
	const svelte = adapter === 'svelte'
	let assertNoRuntimeErrors: () => void
	test.beforeEach(async({page}) => {
		assertNoRuntimeErrors = watchRuntimeErrors(page)
		await page.goto('/')
		if (svelte) await expect(page.locator('#hydration-status')).toHaveAttribute('data-hydrated', 'true')
	})
	test.afterEach(() => assertNoRuntimeErrors())

	test('checkbox transitions @critical', async({page}) => {
		const f = 'FM-CHECKBOX-TRANSITIONS'
		const mixed = page.locator(`#${adapter}-mixed`)
		const disabled = page.locator(`#${adapter}-disabled-check`)
		await branch(f, 'indeterminate', async() => { await expect(mixed).toHaveAttribute('aria-checked', 'mixed') })
		await branch(f, 'disabled', async() => { await expect(disabled).toBeDisabled() })
		if (svelte) {
			await branch(f, 'reactive-disabled', async() => {
				await page.locator('#toggle-checkbox-state').click()
				await expect(disabled).toBeEnabled()
				await disabled.focus()
				await disabled.press('Space')
				await expect(disabled).toBeChecked()
			})
		}
		await branch(f, 'checked', async() => {
			await mixed.focus()
			await mixed.press('Space')
			await expect(mixed).toBeChecked()
			await expect(mixed).toHaveAttribute('aria-checked', 'true')
		})
	})

	test('multi-select limits and actions @critical', async({page}) => {
		const f = 'FM-MULTISELECT-BOUNDS'
		const input = page.locator(svelte ? '#svelte-multi-input' : '#astro-multi')
		await input.focus()
		const list = svelte ? page.locator('#svelte-multi-listbox') : page.getByRole('listbox', {name: 'Tags'})
		const root = svelte ? page.locator('[data-part="root"]').filter({has: input}) : page.locator('[data-ooops-multi-select-root]')
		const chips = root.locator('[data-part="chip"]')
		await branch(f, 'select-all', async() => {
			await list.getByRole('button', {name: 'Select all'}).click()
			await expect(chips).toHaveCount(2)
		})
		await branch(f, 'maximum', async() => {
			await list.getByRole('button', {name: 'Select all'}).click()
			await expect(chips).toHaveCount(2)
		})
		await branch(f, 'keyboard-chip-removal', async() => {
			await input.focus()
			await input.press('Backspace')
			await expect(chips).toHaveCount(1)
		})
		await branch(f, 'clear', async() => {
			await input.focus()
			await list.getByRole('button', {name: 'Clear'}).click()
			await expect(chips).toHaveCount(0)
		})
	})

	test('menu typeahead, checked items and RTL @critical', async({page}) => {
		const f = 'FM-MENU-BRANCHES'
		await page.getByRole('button', {name: svelte ? 'Svelte actions' : 'Actions', exact: true}).click()
		const setting = page.getByRole('menuitemcheckbox', {name: 'Setting'})
		await branch(f, 'checkbox-item', async() => {
			await setting.focus()
			await setting.press('Space')
			await expect(setting).toHaveAttribute('aria-checked', 'false')
		})
		const compact = page.getByRole('menuitemradio', {name: 'Compact'})
		await branch(f, 'typeahead', async() => {
			await setting.press('c')
			await expect(compact).toBeFocused()
		})
		await branch(f, 'radio-item', async() => {
			await compact.press('ArrowDown')
			const comfortable = page.getByRole('menuitemradio', {name: 'Comfortable'})
			await expect(comfortable).toBeFocused()
			await comfortable.press('Space')
			await expect(comfortable).toHaveAttribute('aria-checked', 'true')
			await expect(compact).toHaveAttribute('aria-checked', 'false')
		})
		await page.keyboard.press('Escape')
		await branch(f, 'rtl-submenu', async() => {
			await page.getByRole('button', {name: 'RTL actions', exact: true}).click()
			const more = page.getByRole('menuitem', {name: 'More RTL'})
			await more.focus()
			await more.press('ArrowLeft')
			await expect(page.getByRole('menu', {name: 'More RTL'})).toBeVisible()
		})
	})

	test('tooltip timing and pointer modes', async({page}) => {
		const f = 'FM-TOOLTIP-POINTER'
		const trigger = page.locator(`#${adapter}-tooltip-delayed-trigger`)
		const tooltip = page.getByRole('tooltip', {name: `Delayed ${svelte ? 'Svelte' : 'Astro'} context`})
		await branch(f, 'open-delay', async() => {
			await trigger.hover()
			await page.waitForTimeout(80)
			expect(await tooltip.isHidden()).toBe(true)
			await expect(tooltip).toBeVisible()
		})
		await branch(f, 'close-delay', async() => {
			await page.mouse.move(0, 0)
			await page.waitForTimeout(60)
			expect(await tooltip.isVisible()).toBe(true)
			await expect(tooltip).toBeHidden()
		})
		await branch(f, 'coarse-pointer', async() => {
			await page.evaluate((id) => {
				const original = window.matchMedia.bind(window)
				window.matchMedia = (query) => query === '(pointer: coarse)'
					? ({matches: true, media: query, onchange: null, addListener() {}, removeListener() {},
						addEventListener() {}, removeEventListener() {},
						dispatchEvent: () => false} as MediaQueryList)
					: original(query)
				document.getElementById(id)?.dispatchEvent(new PointerEvent('pointerenter', {bubbles: true, pointerType: 'mouse'}))
			}, `${adapter}-tooltip-delayed-trigger`)
			await page.waitForTimeout(220)
			await expect(tooltip).toBeHidden()
		})
		await branch(f, 'focus-fallback', async() => { await trigger.focus(); await expect(tooltip).toBeVisible() })
	})

	test('viewport collision positioning', async({page}) => {
		const f = 'FM-LAYER-COLLISION'
		await page.goto('/edges')
		await page.getByRole('button', {name: 'Bottom edge'}).click()
		const bottom = page.getByRole('dialog', {name: 'Bottom edge panel'})
		await branch(f, 'flip', async() => { await expect(bottom).toHaveAttribute('data-placement', 'top') })
		await branch(f, 'bottom-edge', async() => { await expectInsideViewport(bottom) })
		await page.keyboard.press('Escape')
		await page.getByRole('button', {name: 'Top edge'}).click()
		const top = page.getByRole('dialog', {name: 'Top edge panel'})
		await branch(f, 'top-edge', async() => { await expect(top).toHaveAttribute('data-placement', 'bottom') })
		await branch(f, 'shift', async() => { await expectInsideViewport(top) })
	})

	test('nested dialog focus and dismissal @critical', async({page}) => {
		const f = 'FM-DIALOG-NESTED'
		const outer = page.getByRole('button', {name: 'Open dialog'})
		await outer.click()
		const nested = page.getByRole('button', {name: 'Open nested modal'})
		const confirm = page.getByRole('button', {name: 'Confirm'})
		await branch(f, 'focus-cycle', async() => {
			await expect(page.getByRole('button', {name: 'Cancel'})).toBeFocused()
			await confirm.focus(); await confirm.press('Tab')
			await expect(nested).toBeFocused()
			await nested.press('Shift+Tab'); await expect(confirm).toBeFocused()
		})
		await branch(f, 'nested-modal', async() => {
			await nested.click(); await expect(page.getByRole('dialog', {name: 'Nested modal'})).toBeVisible()
		})
		await branch(f, 'topmost-escape', async() => {
			await page.keyboard.press('Escape'); await expect(nested).toBeFocused()
			await expect(page.getByRole('dialog', {name: 'Confirm action'})).toBeVisible()
		})
		await branch(f, 'focus-restore', async() => { await page.keyboard.press('Escape'); await expect(outer).toBeFocused() })
	})

	test('manual and navigation tabs', async({page}) => {
		const f = 'FM-TABS-MODES'
		const manual = page.locator(`#${adapter}-tabs-manual`)
		const first = manual.getByRole('tab', {name: 'Manual first'})
		const second = manual.getByRole('tab', {name: 'Manual second'})
		await branch(f, 'manual-focus', async() => {
			await first.focus(); await first.press('ArrowRight'); await expect(second).toBeFocused()
			await expect(first).toHaveAttribute('aria-selected', 'true')
			await expect(second).toHaveAttribute('aria-selected', 'false')
		})
		await branch(f, 'manual-activation', async() => {
			await second.press('Space'); await expect(second).toHaveAttribute('aria-selected', 'true')
		})
		const navigation = page.locator(`#${adapter}-navigation-tabs`)
		await branch(f, 'navigation-links', async() => {
			await expect(navigation.getByRole('link', {name: 'Home'})).toHaveAttribute('href', /.+/)
			await expect(navigation.locator('[role="tab"]')).toHaveCount(0)
		})
		await branch(f, 'aria-current', async() => {
			await expect(navigation.getByRole('link', {name: 'Home'})).toHaveAttribute('aria-current', 'page')
		})
	})

	test('slider keyboard bounds and RTL @critical', async({page}) => {
		const f = 'FM-SLIDER-KEYBOARD'
		const thumbs = page.locator(`#${adapter}-slider ${svelte ? '[role="slider"]' : '[data-part="thumb"]'}`)
		const low = thumbs.nth(0), high = thumbs.nth(1)
		await low.focus()
		await branch(f, 'end', async() => { await low.press('End'); await expect(low).toHaveAttribute('aria-valuenow', '75') })
		await branch(f, 'dual-collision', async() => { await expect(high).toHaveAttribute('aria-valuenow', '80') })
		await branch(f, 'page', async() => { await high.press('PageUp'); await expect(high).toHaveAttribute('aria-valuenow', '100') })
		await branch(f, 'home', async() => { await high.press('Home'); await expect(high).toHaveAttribute('aria-valuenow', '80') })
		await branch(f, 'rtl', async() => {
			const rtl = page.locator(`#${adapter}-slider-rtl ${svelte ? '[role="slider"]' : '[data-part="thumb"]'}`)
			await rtl.focus(); await rtl.press('ArrowRight'); await expect(rtl).toHaveAttribute('aria-valuenow', '49')
		})
	})

	test('number intermediate, empty and clamp states', async({page}) => {
		const f = 'FM-NUMBER-INTERMEDIATE', input = page.locator(`#${adapter}-number`)
		await branch(f, 'invalid-intermediate', async() => {
			await input.fill('')
			await input.pressSequentially('-')
			const badInput = await input.evaluate((element: HTMLInputElement) =>
				element.validity.badInput)
			expect(badInput).toBe(true)
			await expect(input).toHaveAttribute('aria-invalid', 'true')
		})
		await branch(f, 'clamp-on-blur', async() => {
			await input.fill('12'); await input.blur(); await expect(input).toHaveValue('5')
		})
		await branch(f, 'empty', async() => { await input.fill(''); await expect(input).toHaveValue('') })
	})

	test('textarea growth, cap and overflow', async({page}) => {
		const f = 'FM-TEXTAREA-GEOMETRY', textarea = page.locator(`#${adapter}-bio`)
		const initial = await textarea.evaluate((element) => element.getBoundingClientRect().height)
		await textarea.fill('one\ntwo\nthree\nfour\nfive\nsix')
		const geometry = await textarea.evaluate((element) => ({
			height: element.getBoundingClientRect().height,
			overflow: getComputedStyle(element).overflowY,
			lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) || 20}))
		await branch(f, 'grow', async() => { expect(geometry.height).toBeGreaterThan(initial) })
		await branch(f, 'max-rows', async() => { expect(geometry.height).toBeLessThanOrEqual(geometry.lineHeight * 4 + 8) })
		await branch(f, 'overflow', async() => { expect(geometry.overflow).toBe('auto') })
	})

	if (svelte) test('async navigation teardown @critical', async({page}) => {
		const f = 'FM-ASYNC-UNMOUNT', input = page.locator('#svelte-async-combobox-input')
		await input.fill('navigate')
		await expect(page.locator('[data-part="root"]').filter({has: input})).toHaveAttribute('data-loading', 'true')
		await branch(f, 'navigation-unmount', async() => {
			await Promise.all([page.waitForURL((url) => url.pathname === '/cleanup'), page.locator('#cleanup-link').click()])
			await expect(input).toHaveCount(0)
		})
		await branch(f, 'pending-cleanup', async() => { await expect(page.locator('#async-pending')).toHaveText('pending:0') })
		await branch(f, 'abort-signal', async() => { await expect(page.locator('#async-aborted')).toHaveText('aborted:1') })
	})
}

const expectInsideViewport = async(locator: Locator) => {
	const bounds = await locator.boundingBox(), viewport = locator.page().viewportSize()
	expect(bounds).not.toBeNull(); expect(viewport).not.toBeNull()
	expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0)
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width)
	expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height)
}
