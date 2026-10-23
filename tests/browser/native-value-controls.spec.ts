import {expect, test} from '@playwright/test'

test('native slider and tokens retain browser events and recover after form reset', async({page}) => {
	await page.goto('/tests/browser/fixture.html')
	await page.evaluate(async() => {
		const {createSliderController, createTokenInputController} = await import(
			'/packages/ui-primitives/dist/index.js'
		)
		const form = document.createElement('form')
		form.innerHTML = '<input type="range" aria-label="Native level" value="20">'
   + '<input aria-label="Free text"><output></output>'
		document.body.append(form)
		const [range, input] = form.querySelectorAll('input')
		const output = form.querySelector('output')!
		const slider = createSliderController({nativeInput: () => range,
			getRoot: () => range, getThumbs: () => [],
			onInput: (value) => {output.dataset.input = String(value)},
			onCommit: (value) => {output.dataset.commit = String(value)}})
		const tokens = createTokenInputController({getInput: () => input, values: ['Seed'],
			onChange: (values) => {output.textContent = values.join('|')}})
		slider.mount(); tokens.mount()
		const reset = document.createElement('button')
		reset.type = 'reset'; reset.textContent = 'Reset values'; form.append(reset)
	})
	const range = page.getByRole('slider', {name: 'Native level'})
	await range.focus(); await range.press('ArrowRight'); await expect(range).toHaveValue('21')
	const output = page.locator('form').last().locator('output')
	await expect(output).toHaveAttribute('data-input', '21')
	await expect(output).toHaveAttribute('data-commit', '21')
	const input = page.getByRole('textbox', {name: 'Free text'})
	await input.fill('One'); await input.press('Enter'); await expect(output).toHaveText('Seed|One')
	await input.press('Backspace'); await expect(output).toHaveText('Seed')
	await input.fill('Two'); await input.press(','); await expect(output).toHaveText('Seed|Two')
	await page.getByRole('button', {name: 'Reset values'}).click()
	await expect(range).toHaveValue('20'); await expect(output).toHaveText('Seed')
})
