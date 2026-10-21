/** Own external trigger ARIA only for the mounted overlay's lifetime. */
export const connectOverlayTrigger = (anchor: HTMLElement, panelId: string, role: string) => {
	const keys = ['aria-controls', 'aria-haspopup', 'aria-expanded']
	const previous = keys.map((key) => anchor.getAttribute(key))
	anchor.setAttribute('aria-controls', panelId)
	anchor.setAttribute('aria-haspopup', role === 'region' ? 'false' : role)
	return () => keys.forEach((key, index) => {
		const value = previous[index]
		if (value == null) anchor.removeAttribute(key)
		else anchor.setAttribute(key, value)
	})
}
