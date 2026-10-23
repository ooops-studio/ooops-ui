import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

test('color controller retains keyboard, pointer capture, disabled and disposal contracts', async({page}) => {
	await page.goto('/tests/browser/fixture.html')
	await page.evaluate(async() => {
		const {createColorPickerController} = await import('/packages/ui-primitives/dist/index.js')
		const root = document.createElement('section')
		root.id = 'color-contract'
		root.innerHTML = '<div role="slider" aria-label="Color plane" tabindex="0"'
   + ' aria-valuemin="0" aria-valuemax="100" style="width:200px;height:100px"></div>'
   + '<div role="slider" aria-label="Color hue" tabindex="0"'
   + ' aria-valuemin="0" aria-valuemax="360" style="width:200px;height:20px"></div>'
   + '<input aria-label="Color hex"><output aria-label="Committed color"></output>'
   + '<button>Restore red</button><button>Disable color</button><button>Destroy color</button>'
		document.body.append(root)
		const [plane, hue] = root.querySelectorAll<HTMLElement>('[role=slider]')
		const hex = root.querySelector('input')!, output = root.querySelector('output')!
		const owner = createColorPickerController({value: '#ff0000',
			onChange: (value) => {output.textContent = value}})
		owner.subscribe((state) => {
			plane.setAttribute('aria-valuenow', String(Math.round(state.hsv.s * 100)))
			plane.setAttribute('aria-valuetext', state.value)
			hue.setAttribute('aria-valuenow', String(Math.round(state.hsv.h)))
			hex.value = state.draftValue
		})
		plane.addEventListener('keydown', owner.handlePlaneKeyDown)
		hue.addEventListener('keydown', owner.handleHueKeyDown)
		for (const [node, down, move] of [
			[plane, owner.handlePlanePointerDown, owner.handlePlanePointerMove],
			[hue, owner.handleHuePointerDown, owner.handleHuePointerMove]
		] as const) {
			node.addEventListener('pointerdown', down)
			node.addEventListener('pointermove', move)
			node.addEventListener('pointerup', owner.handlePointerEnd)
			node.addEventListener('pointercancel', owner.handlePointerEnd)
			node.addEventListener('lostpointercapture', owner.handlePointerEnd)
		}
		hex.addEventListener('input', () => owner.setDraft(hex.value))
		hex.addEventListener('keydown', owner.handleHexKeyDown)
		const [restore, disable, destroy] = root.querySelectorAll('button')
		restore.onclick = () => {owner.setValue('#ff0000')}
		disable.onclick = () => {owner.configure({disabled: true})}
		destroy.onclick = () => {owner.destroy()}
	})
	const hue = page.getByRole('slider', {name: 'Color hue'})
	const plane = page.getByRole('slider', {name: 'Color plane'})
	const output = page.getByLabel('Committed color'), hex = page.getByRole('textbox', {name: 'Color hex'})
	await hue.focus(); await hue.press('End'); await hue.press('ArrowRight')
	await expect(output).toHaveText('#ff0000')
	await plane.focus(); await plane.press('Home'); await expect(output).toHaveText('#ffffff')
	await plane.press('End'); await expect(output).toHaveText('#000000')
	await page.getByRole('button', {name: 'Restore red'}).click()
	const box = (await plane.boundingBox())!
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
	await page.mouse.down(); await expect(output).toHaveText('#804040')
	await page.mouse.move(box.x + box.width + 10, box.y - 10)
	await expect(output).toHaveText('#ff0000'); await page.mouse.up()
	await hex.fill('ABCDEF'); await hex.press('Enter'); await expect(output).toHaveText('#abcdef')
	await hex.fill('bad'); await hex.press('Enter'); await expect(output).toHaveText('#abcdef')
	await page.getByRole('button', {name: 'Disable color'}).click()
	await hue.focus(); await hue.press('Home'); await expect(output).toHaveText('#abcdef')
	await page.getByRole('button', {name: 'Destroy color'}).click()
	await plane.focus(); await plane.press('End'); await expect(output).toHaveText('#abcdef')
	expect((await new AxeBuilder({page}).include('#color-contract').analyze()).violations).toEqual([])
})
