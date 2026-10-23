import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

test('toast queue retains timers while focus is inside, persistent messages and teardown', async({page}) => {
	await page.clock.install()
	await page.goto('/tests/browser/fixture.html')
	await expect(page).toHaveTitle('Ooops UI browser fixture')
	await page.evaluate(async() => {
		const {createToastStackController} = await import('/packages/ui-primitives/dist/index.js')
		const root = document.createElement('section')
		root.id = 'toast-contract'
		root.innerHTML = '<button>Add temporary</button><button>Add persistent</button><button>Destroy toasts</button>'
   + '<div aria-live="polite" aria-atomic="true"></div>'
		document.body.prepend(root)
		const region = root.querySelector('div')!
		const owner = createToastStackController<string>({defaultDurationMs: 1200,
			shouldDeferExpiry: () => region.contains(document.activeElement)})
		owner.subscribe(({items}) => {
			for (const row of region.querySelectorAll<HTMLElement>('[data-toast-id]')) {
				if (!items.some((item) => item.id === Number(row.dataset.toastId))) row.remove()
			}
			for (const item of items) {
				if (region.querySelector(`[data-toast-id="${item.id}"]`)) continue
				const row = document.createElement('div')
				row.dataset.toastId = String(item.id); row.setAttribute('role', 'status')
				row.textContent = item.value
				const close = document.createElement('button')
				close.textContent = 'Dismiss'; close.setAttribute('aria-label', `Dismiss ${item.value}`)
				close.onclick = () => {owner.dismiss(item.id)}
				row.append(close); region.append(row)
			}
		})
		const [temporary, persistent, destroy] = root.querySelectorAll('button')
		temporary.onclick = () => {owner.push('Temporary')}
		persistent.onclick = () => {owner.push('Persistent', {durationMs: null})}
		destroy.onclick = () => {owner.destroy(); region.replaceChildren()}
	})
	await page.getByRole('button', {name: 'Add temporary', exact: true}).click()
	await page.getByRole('button', {name: 'Add persistent', exact: true}).click()
	const region = page.locator('#toast-contract [aria-live=polite]')
	const close = page.getByRole('button', {name: 'Dismiss Persistent', exact: true})
	await close.focus(); await page.clock.fastForward(10_000)
	await expect(region.getByRole('status')).toHaveCount(2); await expect(close).toBeFocused()
	await page.getByRole('button', {name: 'Add temporary', exact: true}).focus()
	await page.clock.fastForward(200)
	await expect(region.getByRole('status')).toHaveCount(1)
	await close.focus(); await close.press('Enter'); await expect(region.getByRole('status')).toHaveCount(0)
	await page.getByRole('button', {name: 'Add temporary', exact: true}).click()
	await page.getByRole('button', {name: 'Destroy toasts', exact: true}).click()
	await page.clock.fastForward(10_000)
	await page.getByRole('button', {name: 'Add temporary', exact: true}).click()
	await expect(region.getByRole('status')).toHaveCount(0)
	expect((await new AxeBuilder({page}).include('#toast-contract').analyze()).violations).toEqual([])
})
