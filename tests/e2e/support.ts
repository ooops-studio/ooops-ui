import AxeBuilder from '@axe-core/playwright'
import {expect, type Page, type TestInfo} from '@playwright/test'

export const watchRuntimeErrors = (page: Page) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
	page.on('console', (message) => {
		if (message.type() !== 'error' && message.type() !== 'warning') return
		const text = message.text()
		if (/favicon\.ico/i.test(text)) return
		if (/Firefox.*scroll-linked positioning effect|appears to use a scroll-linked positioning effect/i.test(text)) return
		errors.push(`${message.type()}: ${text}`)
	})
	return () => expect(errors, 'browser console and hydration errors').toEqual([])
}

export const expectNoAxeViolations = async(page: Page, testInfo: TestInfo) => {
	const results = await new AxeBuilder({page}).analyze()
	expect(results.violations, `axe violations in ${testInfo.project.name}`).toEqual([])
}
