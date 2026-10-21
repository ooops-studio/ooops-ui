/** Consumer-owned CSS hooks. No behavior, event handlers or ARIA can be replaced. */
export type UiPartStyle = {class?: string; style?: string}
export type UiParts = Readonly<Record<string, UiPartStyle | undefined>>
export type UiStylingProps = {parts?: UiParts}

export function getUiPart(
	parts: UiParts | undefined,
	part: string,
	baseClass?: string | null | Array<string | undefined | false>,
	baseStyle?: string | null
) {
	const custom = parts?.[part]
	const classes = [
		Array.isArray(baseClass) ? baseClass.filter(Boolean).join(' ') : baseClass,
		custom?.class
	]
		.filter(Boolean)
		.join(' ')
	const styles = [baseStyle, custom?.style].filter(Boolean).join(';')
	return {class: classes || undefined, style: styles || undefined}
}
