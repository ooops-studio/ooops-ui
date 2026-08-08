export const portal = (node: HTMLElement, enabled = true) => {
	if (!enabled || typeof document === 'undefined') return {}
	document.body.appendChild(node)
	return {destroy: () => node.remove()}
}
