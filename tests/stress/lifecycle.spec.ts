import {expect, test} from '@playwright/test'

declare global {
	interface Window {
		__ooopsListenerCounts?: () => Record<string, number>
	}
}

const installListenerTracker = async(page: import('@playwright/test').Page) => {
	await page.addInitScript(() => {
		const tracked = new Map<EventTarget, Map<string, Set<EventListenerOrEventListenerObject>>>()
		const add = EventTarget.prototype.addEventListener
		const remove = EventTarget.prototype.removeEventListener
		EventTarget.prototype.addEventListener = function(type, listener, options) {
			const oneShot = typeof options === 'object' && options?.once === true
			if ((this === window || this === document) && listener && !oneShot) {
				const target = tracked.get(this) ?? new Map()
				const listeners = target.get(type) ?? new Set()
				listeners.add(listener)
				target.set(type, listeners)
				tracked.set(this, target)
			}
			return add.call(this, type, listener, options)
		}
		EventTarget.prototype.removeEventListener = function(type, listener, options) {
			if ((this === window || this === document) && listener)
				tracked.get(this)?.get(type)?.delete(listener)
			return remove.call(this, type, listener, options)
		}
		window.__ooopsListenerCounts = () => {
			const result: Record<string, number> = {}
			for (const [target, types] of tracked)
				for (const [type, listeners] of types)
					result[`${target === window ? 'window' : 'document'}:${type}`] = listeners.size
			return result
		}
	})
}

test('Astro survives 100 mount/unmount navigation cycles without listener or portal growth', async({page}, testInfo) => {
	test.skip(!testInfo.project.name.includes('stress-astro'))
	test.setTimeout(240_000)
	await installListenerTracker(page)
	await page.goto('/')
	await astroCycle(page)
	const baseline = await page.evaluate(() => window.__ooopsListenerCounts?.())
	const baselinePortals = await page.locator('[data-ooops-portal-owned="true"]').count()
	for (let index = 0; index < 100; index += 1) {
		await page.getByRole('button', {name: 'Open popover'}).click()
		await expect(page.locator('[data-ooops-popover-panel="astro-popover"]')).toHaveCount(1)
		await Promise.all([
			page.waitForURL((url) => /^\/transition\/?$/.test(url.pathname)),
			page.locator('#popover-transition-link').click()
		])
		await expect(page.locator('[data-ooops-popover-panel="astro-popover"]')).toHaveCount(0)
		await Promise.all([
			page.waitForURL((url) => url.pathname === '/'),
			page.getByRole('link', {name: 'Return to components'}).click()
		])
	}
	expect(await page.evaluate(() => window.__ooopsListenerCounts?.())).toEqual(baseline)
	await expect(page.locator('[data-ooops-portal-owned="true"]')).toHaveCount(baselinePortals)
})

test('Svelte survives 100 async mount/unmount navigation cycles without leaks', async({page}, testInfo) => {
	test.skip(!testInfo.project.name.includes('stress-svelte'))
	test.setTimeout(240_000)
	await installListenerTracker(page)
	await page.goto('/')
	await svelteCycle(page)
	const baseline = await page.evaluate(() => window.__ooopsListenerCounts?.())
	const baselineHiddenListboxes = await page.locator('body > [data-part="listbox"][hidden]').count()
	for (let index = 0; index < 100; index += 1) {
		await page.locator('#svelte-async-combobox-input').fill('navigate')
		await Promise.all([
			page.waitForURL((url) => url.pathname === '/cleanup'),
			page.locator('#cleanup-link').click()
		])
		await expect(page.locator('#async-pending')).toHaveText('pending:0')
		await expect(page.locator('[data-part="listbox"]')).toHaveCount(0)
		await Promise.all([
			page.waitForURL((url) => url.pathname === '/'),
			page.getByRole('link', {name: 'Return to components'}).click()
		])
	}
	expect(await page.evaluate(() => window.__ooopsListenerCounts?.())).toEqual(baseline)
	expect(await page.evaluate(() => Number(sessionStorage.getItem('svelte-async-pending') ?? -1))).toBe(0)
	expect(await page.evaluate(() => Number(sessionStorage.getItem('svelte-async-aborted') ?? 0))).toBeGreaterThanOrEqual(100)
	await expect(page.locator('body > [data-part="listbox"][hidden]')).toHaveCount(baselineHiddenListboxes)
})

const astroCycle = async(page: import('@playwright/test').Page) => {
	await Promise.all([
		page.waitForURL((url) => /^\/transition\/?$/.test(url.pathname)),
		page.locator('#transition-link').click()
	])
	await Promise.all([
		page.waitForURL((url) => url.pathname === '/'),
		page.getByRole('link', {name: 'Return to components'}).click()
	])
}

const svelteCycle = async(page: import('@playwright/test').Page) => {
	await Promise.all([
		page.waitForURL((url) => url.pathname === '/cleanup'),
		page.locator('#cleanup-link').click()
	])
	await Promise.all([
		page.waitForURL((url) => url.pathname === '/'),
		page.getByRole('link', {name: 'Return to components'}).click()
	])
}
