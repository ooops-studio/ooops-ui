import {createMenuController, createTooltipController} from '@ooopsstudio/ui-primitives'

import {mountUiRoots, readUiConfig} from './shared'

type MenuConfig = {id: string; open?: boolean; loop?: boolean; portal?: boolean}
const mountMenu = (root: HTMLElement) => {
	const config = readUiConfig<MenuConfig>(root)
	const trigger = root.querySelector<HTMLElement>('[data-part="trigger"]')
	const menu = document.querySelector<HTMLElement>(
		`[data-ooops-menu-content="${CSS.escape(config.id)}"]`
	)
	if (!trigger || !menu) return null
	const controller = createMenuController({
		...config,
		getTrigger: () => trigger,
		getMenu: () => menu,
		getItems: () => Array.from(menu.querySelectorAll('[role^="menuitem"]')),
		getSubmenu: (item) => item.parentElement?.querySelector<HTMLElement>('[role="menu"]')
	})
	controller.mount()
	return {destroy: controller.destroy}
}

type TooltipConfig = {
	id: string
	openDelayMs?: number
	closeDelayMs?: number
	touch?: 'disabled' | 'longpress'
	portal?: boolean
}
const mountTooltip = (root: HTMLElement) => {
	const config = readUiConfig<TooltipConfig>(root)
	const trigger = root.querySelector<HTMLElement>('[data-part="trigger"]')
	const tooltip = document.querySelector<HTMLElement>(
		`[data-ooops-tooltip-content="${CSS.escape(config.id)}"]`
	)
	if (!trigger || !tooltip) return null
	const controller = createTooltipController({
		...config,
		getTrigger: () => trigger,
		getTooltip: () => tooltip
	})
	controller.mount()
	return {destroy: controller.destroy}
}

export const installDropdownMenu = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-menu-root]', mountMenu, scope)
export const installTooltip = (scope?: ParentNode) =>
	mountUiRoots('[data-ooops-tooltip-root]', mountTooltip, scope)
