import {beforeEach, describe, expect, it, vi} from 'vitest'

import {destroyAstroUi, destroyMountedUi, installInput, mountAstroUi, serializeUiConfig} from './index'

beforeEach(() => {
	destroyAstroUi()
	document.body.innerHTML = ''
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1 })
	globalThis.ResizeObserver = class {
		observe() {}
		disconnect() {}
		unobserve() {}
	} as unknown as typeof ResizeObserver
})

describe('Astro UI runtime', () => {
	it('escapes inline configuration safely', () => {
		const serialized = serializeUiConfig({value: '</script><script>alert(1)</script>'})
		expect(serialized).not.toContain('</script>')
		expect(serialized).toContain('\\u003c')
	})

	it('mounts a select once and synchronizes its native control', () => {
		document.body.innerHTML = `
      <div data-ooops-select-root="status" data-placeholder="Select"><button data-part="trigger"></button><span data-part="value"></span><select data-part="native-select"><option value=""></option><option value="draft">Draft</option></select><script type="application/json" data-ooops-ui-config>{"id":"status","value":"","defaultValue":"","disabled":false,"allowEmpty":true,"portal":true,"options":[{"value":"draft","label":"Draft"}]}</script></div>
      <div data-ooops-select-listbox="status"><div id="status-option-0" data-ooops-select-option data-option-index="0"></div></div>
    `
		mountAstroUi()
		mountAstroUi()
		const trigger = document.querySelector<HTMLElement>('[data-part="trigger"]')!
		trigger.click()
		expect(trigger.getAttribute('aria-expanded')).toBe('true')
		expect(document.body.querySelector('[data-ooops-select-listbox="status"]')).not.toBeNull()
	})

	it('reinstalls component-specific controllers after Astro view transitions', () => {
		document.body.innerHTML = '<div data-ooops-input-root><input value="hello" data-part="control"><button data-part="clear"></button><script type="application/json" data-ooops-ui-config>{"value":"hello","defaultValue":"hello"}</script></div>'
		installInput()
		const input = document.querySelector<HTMLInputElement>('input')!
		document.querySelector<HTMLButtonElement>('button')!.click()
		expect(input.value).toBe('')
		document.dispatchEvent(new Event('astro:before-swap'))
		input.value = 'again'
		document.dispatchEvent(new Event('astro:page-load'))
		document.querySelector<HTMLButtonElement>('button')!.click()
		expect(input.value).toBe('')
		destroyMountedUi()
	})
})
