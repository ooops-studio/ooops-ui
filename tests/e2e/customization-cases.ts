import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

export function registerCustomizationCases() {
	test('all component parts accept consumer classes and CSS, including portal content @critical', async({
		page
	}) => {
		await test.step('[FM-STYLING/part-hooks]', async() => {
			const errors: string[] = []
			page.on('pageerror', (error) => errors.push(error.message))
			await page.goto('/styling')
			await expect(page.locator('h1')).toBeVisible()
			// Every mounted owned element must retain the caller's explicit part styling.
			const check = async() =>
				expect(
					await page
						.locator('[data-ooops-ui][data-part]')
						.evaluateAll((nodes) =>
							nodes
								.filter(
									(node) =>
										!node.classList.contains(`consumer-${node.getAttribute('data-part')}`) ||
										(node as HTMLElement).style.getPropertyValue('--consumer-hook') !== '1'
								)
								.map((node) => node.outerHTML.slice(0, 180))
						)
				).toEqual([])
			await check()
			expect(await page.locator('[data-ooops-ui][data-part]').count()).toBeGreaterThan(150)
			const combo = page.getByRole('combobox', {name: 'Country combobox', exact: true})
			await combo.fill('It')
			await expect(page.getByRole('option', {name: /Italy/})).toBeVisible()
			await check()
			await page.getByRole('option', {name: /Italy/}).click()
			await page.getByRole('combobox', {name: 'Tags', exact: true}).fill('Code')
			await page.getByRole('option', {name: 'Code', exact: true}).click()
			await check()
			await page.keyboard.press('Escape')
			expect(errors).toEqual([])
		})
	})

	test('formatted dates preserve ISO submission, reject impossible input, clear and reset @critical', async({
		page
	}) => {
		await test.step('[FM-CALENDAR-INPUT/display-format]', async() => {
			await page.goto('/calendar')
			await expect(page.locator('#ready')).toHaveText('ready')
			const input = page.getByLabel('Formatted date', {exact: true})
			await expect(input).toHaveValue('21 - 10 - 2026')
			await input.fill('31 - 02 - 2026')
			await input.blur()
			expect(await input.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(false)
			await expect(page.locator('#formatted')).toHaveValue('2026-10-21')
			await input.fill('22 - 10 - 2026')
			await input.blur()
			expect(await input.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(true)
			await expect(page.locator('#formatted')).toHaveValue('2026-10-22')
			expect(
				await page
					.locator('#formatted-dates')
					.evaluate((form: HTMLFormElement) => Object.fromEntries(new FormData(form)))
			).toMatchObject({formatted: '2026-10-22', appointment: '2026-10-21T13:35'})
			await input
				.locator('..')
				.getByRole('button', {name: 'Clear date', exact: true})
				.click()
			await expect(input).toHaveValue('')
			await expect(page.locator('#formatted')).toHaveValue('')
			expect(
				await input.evaluate((node: HTMLInputElement) => node.validity.valueMissing)
			).toBe(true)
			await page.getByRole('button', {name: 'Reset formatted dates'}).click()
			await expect(input).toHaveValue('21 - 10 - 2026')
			await expect(page.getByLabel('ISO formatted date', {exact: true})).toHaveValue(
				'2026-10-21'
			)
			await input
				.locator('..')
				.getByRole('button', {name: /^Choose date/})
				.click()
			await page.screenshot({
				path: `/tmp/ooops-ui-${test.info().project.name}-calendar-custom-desktop.png`
			})
			await page.keyboard.press('Escape')
		})
	})

	test('datetime keeps local time through calendar selection and validates time bounds/step @critical', async({
		page
	}) => {
		await test.step('[FM-CALENDAR-INPUT/local-datetime]', async() => {
			await page.goto('/calendar')
			await expect(page.locator('#ready')).toHaveText('ready')
			const input = page.getByLabel('Appointment', {exact: true}),
				time = page.getByLabel('Appointment Time', {exact: true})
			await expect(input).toHaveValue('10-21-2026')
			await expect(time).toHaveValue('13:35')
			await time.fill('11:30')
			expect(await input.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(false)
			await time.fill('14:07')
			expect(await input.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(false)
			await time.fill('')
			expect(await input.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(false)
			await time.fill('14:50')
			expect(await time.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(true)
			expect(await input.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(true)
			await input
				.locator('..')
				.getByRole('button', {name: /^Choose date/})
				.click()
			await page.locator('dialog[open] [data-date="2026-10-22"]').click()
			await expect(page.locator('#appointment')).toHaveValue('2026-10-22T14:50')
			await page.getByRole('button', {name: 'Reset formatted dates'}).click()
			await expect(time).toHaveValue('13:35')
			await expect(page.locator('#appointment')).toHaveValue('2026-10-21T13:35')
		})
	})

	test('month/year navigation keeps branded day styles after rerender and fits mobile @critical', async({
		page
	}) => {
		await test.step('[FM-CALENDAR-INPUT/custom-content]', async() => {
			await page.setViewportSize({width: 393, height: 852})
			const errors: string[] = []
			page.on('pageerror', (error) => errors.push(error.message))
			await page.goto('/calendar')
			await expect(page.locator('#ready')).toHaveText('ready')
			await page
				.getByLabel('Formatted date', {exact: true})
				.locator('..')
				.getByRole('button', {name: /^Choose date/})
				.click()
			const dialog = page.locator('dialog[open]')
			const header = dialog.locator('[data-part=calendar-header]')
			await expect(header.getByRole('button', {name: /^Month:/})).toBeVisible()
			await expect(header.getByRole('spinbutton', {name: 'Year'})).toBeVisible()
			const rowBoxes = await Promise.all(['previous', 'month-controls', 'next'].map(
				(part) => header.locator(`[data-part=${part}]`).boundingBox()
			))
			const centers = rowBoxes.map((box) => box!.y + box!.height / 2)
			expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2)
			const title = await dialog.locator('[data-part=month-title]').boundingBox()
			expect(title!.width).toBeLessThanOrEqual(1)
			expect(title!.height).toBeLessThanOrEqual(1)
			await dialog.getByRole('button', {name: /^Month:/}).click()
			await expect(dialog.getByRole('menu', {name: 'Month', exact: true})).toBeVisible()
			await page.keyboard.press('Escape')
			await expect(dialog).toBeVisible()
			await expect(dialog.getByRole('button', {name: /^Month:/})).toBeFocused()
			await dialog.getByRole('button', {name: /^Month:/}).click()
			await dialog.getByRole('menuitemradio', {name: 'December', exact: true}).click()
			await expect(dialog).toHaveAccessibleName('December 2026')
			const day = dialog.locator('[data-date="2026-12-22"]')
			await expect(day).toHaveClass('branded-day')
			await expect(day.locator('[data-custom-day]')).toHaveText('22')
			await page.screenshot({
				path: `/tmp/ooops-ui-${test.info().project.name}-calendar-custom-mobile.png`
			})
			await expect(dialog.locator('[data-part=previous] [data-nav-glyph]')).toHaveText('←')
			await expect(day).toHaveCSS('background-color', 'rgb(20, 60, 90)')
			await dialog.getByRole('spinbutton', {name: 'Year'}).fill('2025')
			await dialog.getByRole('spinbutton', {name: 'Year'}).press('Enter')
			// Calendar model clamps navigation to configured date bounds.
			await expect(dialog).toHaveAccessibleName('October 2026')
			expect(
				(await new AxeBuilder({page}).include('dialog[open]').analyze()).violations
			).toEqual([])
			const box = (await dialog.boundingBox())!
			expect(box.x).toBeGreaterThanOrEqual(16)
			expect(box.x + box.width).toBeLessThanOrEqual(377)
			await page.keyboard.press('Escape')
			expect(errors).toEqual([])
		})
	})

	test('formatted datetime has a native no-JS fallback with canonical form data', async({
		browser,
		baseURL
	}) => {
		await test.step('[FM-CALENDAR-INPUT/native-fallback]', async() => {
			const context = await browser.newContext({javaScriptEnabled: false}),
				page = await context.newPage()
			try {
				await page.goto(`${baseURL}/calendar`)
				await expect(page.getByLabel('Appointment', {exact: true})).toHaveAttribute(
					'type',
					'datetime-local'
				)
				await expect(page.getByLabel('Appointment', {exact: true})).toHaveValue(
					'2026-10-21T13:35'
				)
				await expect(page.locator('[data-part="display-input"]:visible')).toHaveCount(0)
			} finally {
				await context.close()
			}
		})
	})
	test('formatted controls retain external form ownership and datetime range validation @critical', async({
		page
	}) => {
		await test.step('[FM-CALENDAR-INPUT/external-form]', async() => {
			await page.goto('/calendar')
			await expect(page.locator('#ready')).toHaveText('ready')
			const date = page.getByLabel('External date', {exact: true})
			expect(await date.evaluate((node: HTMLInputElement) => node.form?.id)).toBe(
				'external-dates'
			)
			await date.fill('22-10-2026')
			await date.blur()
			const range = page.getByRole('group', {name: 'Agenda', exact: true})
			await range.getByLabel('End date Time', {exact: true}).fill('09:00')
			expect(
				await range
					.getByLabel('End date', {exact: true})
					.evaluate((node: HTMLInputElement) => node.validity.valid)
			).toBe(false)
			await range.getByLabel('End date Time', {exact: true}).fill('12:00')
			expect(
				await range
					.getByLabel('End date', {exact: true})
					.evaluate((node: HTMLInputElement) => node.validity.valid)
			).toBe(true)
			expect(
				await page
					.locator('#external-dates')
					.evaluate((form: HTMLFormElement) => Object.fromEntries(new FormData(form)))
			).toEqual({
				outside: '2026-10-22',
				'agenda-start': '2026-10-21T10:00',
				'agenda-end': '2026-10-21T12:00'
			})
			await page.getByRole('button', {name: 'Reset external dates'}).click()
			await expect(date).toHaveValue('21-10-2026')
			await expect(range.getByLabel('End date Time', {exact: true})).toHaveValue('11:00')
		})
	})
}
