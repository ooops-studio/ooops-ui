type PortalOptions = boolean | {enabled: boolean; target?: HTMLElement | null}
export const portal = (node: HTMLElement, options: PortalOptions = true) => {
	const enabled = typeof options === 'boolean' ? options : options.enabled
	if (!enabled || typeof document === 'undefined') return {}
	const target = typeof options === 'boolean' ? document.body : options.target ?? document.body
	target.appendChild(node)
	return {destroy: () => node.remove()}
}
