import {createAccordionController, createTabsController} from '@ooopsstudio/ui-primitives'

import {mountUiRoots, readUiConfig} from './shared'

type TabsConfig = {
	activeId: string
	defaultActiveId?: string
	mode?: 'panels' | 'navigation'
	activation?: 'automatic' | 'manual'
	orientation?: 'horizontal' | 'vertical'
	loop?: boolean
}
const mountTabs = (root: HTMLElement) => {
	const config = readUiConfig<TabsConfig>(root)
	const controller = createTabsController({
		...config,
		getTabs: () => Array.from(root.querySelectorAll('[data-tab]')),
		getPanels: () => Array.from(root.querySelectorAll('[data-tab-panel]')),
		onChange: (activeId) =>
			root.dispatchEvent(
				new CustomEvent('ooops:tabs-change', {bubbles: true, detail: {activeId}})
			)
	})
	controller.mount()
	return {destroy: controller.destroy}
}

type AccordionConfig = {
	openIds?: string[]
	defaultOpenIds?: string[]
	type?: 'single' | 'multiple'
	collapsible?: boolean
}
const mountAccordion = (root: HTMLElement) => {
	const config = readUiConfig<AccordionConfig>(root)
	const controller = createAccordionController({
		...config,
		getTriggers: () => Array.from(root.querySelectorAll('[data-accordion-trigger]')),
		getPanels: () => Array.from(root.querySelectorAll('[data-accordion-panel]')),
		onChange: (openIds) =>
			root.dispatchEvent(
				new CustomEvent('ooops:accordion-change', {bubbles: true, detail: {openIds}})
			)
	})
	controller.mount()
	return {destroy: controller.destroy}
}

export const installTabs = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-tabs-root]', mountTabs, scope)
export const installAccordion = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-accordion-root]', mountAccordion, scope)
