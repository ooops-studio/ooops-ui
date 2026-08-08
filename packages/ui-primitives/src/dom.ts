export const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

export const nextFrame = (callback: () => void) => {
	if (!isBrowser()) return 0
	return window.requestAnimationFrame(callback)
}

export const isNodeInside = (
	target: EventTarget | null,
	elements: ReadonlyArray<Element | null | undefined>
) => target instanceof Node && elements.some((element) => Boolean(element?.contains(target)))

export const dispatchUiEvent = <Detail>(
	target: EventTarget | null | undefined,
	name: string,
	detail: Detail
) => {
	if (!target || typeof CustomEvent === 'undefined') return
	target.dispatchEvent(new CustomEvent(name, {bubbles: true, detail}))
}

export const enabledIndices = <Option extends {disabled?: boolean}>(
	options: ReadonlyArray<Option>
) =>
	options.flatMap((option, index) => (option.disabled ? [] : [index]))

export const nextEnabledIndex = <Option extends {disabled?: boolean}>(
	options: ReadonlyArray<Option>,
	current: number,
	direction: 1 | -1,
	loop = true
) => {
	const enabled = enabledIndices(options)
	if (enabled.length === 0) return -1
	const currentPosition = enabled.indexOf(current)
	if (currentPosition < 0) return direction === 1 ? enabled[0]! : enabled.at(-1)!
	const nextPosition = currentPosition + direction
	if (nextPosition >= 0 && nextPosition < enabled.length) return enabled[nextPosition]!
	return loop ? (direction === 1 ? enabled[0]! : enabled.at(-1)!) : current
}
