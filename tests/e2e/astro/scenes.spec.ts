import {expect, test} from '@playwright/test'

test('scene adapter renders pixels and gates pointer input behind Interact mode @critical', async({page}) => {
	await page.goto('/scenes')
	const root = page.locator('[data-ooops-scene-root="fixture-scene"]')
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'running')
	await expect(root).toHaveAttribute('data-ooops-scene-backend', 'canvas2d')
	const nonBlank = await root.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
		const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
		return Boolean(data?.some((value) => value !== 0))
	})
	expect(nonBlank).toBe(true)
	await root.hover({position: {x: 40, y: 40}})
	expect(await root.getAttribute('data-fixture-pointers')).toBeNull()
	await page.evaluate(() => document.dispatchEvent(new CustomEvent('ooops:scene-mode', {
		detail: {mode: 'interact'}
	})))
	await root.hover({position: {x: 120, y: 70}})
	await expect(root).toHaveAttribute('data-fixture-pointers', /[1-9]/)
})

test('scene adapter pauses, restores focus controls and falls back on context loss @critical', async({page}) => {
	await page.goto('/scenes')
	const root = page.locator('[data-ooops-scene-root="fixture-scene"]')
	const pause = page.getByRole('button', {name: 'Pause animation'})
	await pause.click()
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'paused')
	await expect(page.getByRole('button', {name: 'Resume animation'})).toHaveAttribute('aria-pressed', 'true')
	await page.getByRole('button', {name: 'Resume animation'}).click()
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'running')
	await root.locator('canvas').evaluate((canvas) => {
		canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}))
	})
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'fallback')
	await expect(root).toHaveAttribute('data-ooops-scene-fallback', 'context-lost')
})

test('scene adapter remounts once after Astro view transitions @critical', async({page}) => {
	await page.goto('/scenes')
	const root = page.locator('[data-ooops-scene-root="fixture-scene"]')
	await expect(root).toHaveAttribute('data-fixture-mounts', '1')
	await page.getByRole('link', {name: 'Leave scene'}).click()
	await expect(page).toHaveURL(/\/transition/)
	await page.goBack()
	await expect(root).toHaveAttribute('data-fixture-mounts', '1')
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'running')
})

test('reduced motion keeps the deterministic poster fallback @critical', async({page}) => {
	await page.emulateMedia({reducedMotion: 'reduce'})
	await page.goto('/scenes')
	const root = page.locator('[data-ooops-scene-root="fixture-scene"]')
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'paused')
	await expect(root.locator('[data-part="poster"]')).toBeVisible()
})
