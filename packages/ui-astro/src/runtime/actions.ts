import {createButtonController} from '@ooopsstudio/ui-primitives'

import {mountUiRoots} from './shared'

export const installButton = (scope?: ParentNode) => mountUiRoots('[data-ooops-astro-button]', (root) => {
	if (!(root instanceof HTMLButtonElement || root instanceof HTMLAnchorElement)) return null
	const controller = createButtonController({getElement: () => root, href: root.dataset.ooopsHref,
		ariaBusy: root.dataset.ooopsAriaBusy as 'true' | 'false' | undefined,
		ariaDisabled: root.dataset.ooopsAriaDisabled as 'true' | 'false' | undefined,
		disabled: root.dataset.disabled === 'true', loading: root.dataset.loading === 'true',
		type: root instanceof HTMLButtonElement ? root.type as 'button' | 'submit' | 'reset' : undefined,
		tabindex: root.hasAttribute('tabindex') ? root.tabIndex : undefined})
	controller.mount()
	return controller
}, scope)
