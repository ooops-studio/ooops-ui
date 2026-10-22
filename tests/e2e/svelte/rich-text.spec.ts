import {randomUUID} from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import {test, expect} from '@playwright/test'

for (const width of [1280, 390]) test.describe(`rich text ${width}`, () => {
	test.use({viewport: {width, height: 850}})
	const branch = (id: string, check: () => Promise<void>) =>
		test.step(width === 1280 ? `[FM-RICH-TEXT/${id}]` : `Mobile ${id}`, check)
	test('@critical standalone rich text uses formatting and native undo without collaboration', async({page}) => {
		await branch('standalone', async() => {
			const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message))
			await page.goto('/rich-text')
			await expect(page).toHaveTitle('Rich text contract')
			await expect(page.getByRole('status')).toHaveText('Editor ready')
			const editor = page.getByRole('textbox', {name: 'Description'})
			await editor.click(); await page.keyboard.press('ControlOrMeta+End')
			await page.keyboard.insertText(' local')
			await page.keyboard.press('ControlOrMeta+z')
			await expect(editor).toHaveText('Standalone rich text')
			await page.keyboard.press('ControlOrMeta+Shift+z')
			await expect(editor).toContainText('local')
			await page.getByRole('button', {name: 'Bold', exact: true}).click()
			await page.keyboard.insertText(' bold')
			await expect(editor.locator('strong')).toHaveText(' bold')
			const accessibility = await new AxeBuilder({page}).include('main').analyze()
			expect(accessibility.violations).toEqual([])
			expect(errors).toEqual([])
		})
	})

	test('@critical concurrent Yjs peers reconnect, recover a closed tab and undo only local edits', async({page, context}) => {
		const room = randomUUID()
		const route = (user: string) => `/rich-text?mode=collaborative&room=${room}&user=${user}`
		const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message))
		await page.goto(route('alice'))
		const a = page.getByRole('textbox', {name: 'Description'})
		await expect(page.getByRole('status')).toHaveText('Editor ready')
		await a.click(); await page.keyboard.insertText('Seed')
		const peer = await context.newPage(); peer.on('pageerror', (error) => errors.push(error.message))
		await peer.goto(route('bob'))
		const b = peer.getByRole('textbox', {name: 'Description'})
		await expect(b).toContainText('Seed')
		await page.getByRole('button', {name: 'Disconnect'}).click()
		await peer.getByRole('button', {name: 'Disconnect'}).click()
		await a.click(); await page.keyboard.press('ControlOrMeta+Home'); await page.keyboard.insertText('Alice ')
		await b.click(); await peer.keyboard.press('ControlOrMeta+End'); await peer.keyboard.insertText(' Bob')
		await page.getByRole('button', {name: 'Reconnect'}).click()
		await peer.getByRole('button', {name: 'Reconnect'}).click()
		await branch('concurrent', async() => {
			await expect(a).toContainText('Bob'); await expect(b).toContainText('Alice')
			await expect.poll(() => a.innerText()).toBe(await b.innerText())
		})
		await branch('local-undo', async() => {
			await peer.getByRole('button', {name: 'Undo', exact: true}).click()
			await expect(a).not.toContainText('Bob'); await expect(a).toContainText('Alice')
		})
		await branch('reconnect-recovery', async() => {
			await peer.getByRole('button', {name: 'Disconnect'}).click()
			await b.click(); await peer.keyboard.press('ControlOrMeta+End'); await peer.keyboard.insertText(' retained')
			await peer.close()
			await a.click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.insertText(' online')
			const reopened = await context.newPage(); reopened.on('pageerror', (error) => errors.push(error.message))
			await reopened.goto(route('bob'))
			await expect(a).toContainText('retained')
			await expect(reopened.getByRole('textbox', {name: 'Description'})).toContainText('online')
		})
		expect(errors).toEqual([])
	})
})
