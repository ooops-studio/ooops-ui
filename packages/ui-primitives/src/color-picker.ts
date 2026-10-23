import {createControllerStore} from './store'

export type ColorRgb = Readonly<{r: number; g: number; b: number}>
export type ColorHsv = Readonly<{h: number; s: number; v: number}>
export type ColorPickerState = {
	value: string
	draftValue: string
	rgb: ColorRgb
	hsv: ColorHsv
	hueColor: string
}
export type ColorPickerOptions = {
	value: string
	disabled?: boolean
	fallbackValue?: string
	onChange?: (value: string) => void
}
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const finite = (...values: number[]) => {
	if (!values.every(Number.isFinite)) throw new RangeError('Color channels must be finite.')
}
export const normalizeHexColor = (raw: string): string | null => {
	const trimmed = raw.trim()
	if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
	if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`
	return null
}
export const colorHexToRgb = (raw: string): ColorRgb => {
	const hex = normalizeHexColor(raw)
	if (!hex) throw new RangeError('Expected a six-digit hex color.')
	const value = Number.parseInt(hex.slice(1), 16)
	return {r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255}
}
export const colorRgbToHex = (r: number, g: number, b: number) => {
	finite(r, g, b)
	return `#${[r, g, b].map((channel) => Math.round(clamp(channel, 0, 255))
		.toString(16).padStart(2, '0')).join('')}`
}
export const colorRgbToHsv = (r: number, g: number, b: number): ColorHsv => {
	finite(r, g, b)
	const rn = clamp(r, 0, 255) / 255, gn = clamp(g, 0, 255) / 255
	const bn = clamp(b, 0, 255) / 255
	const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min
	let h = 0
	if (delta !== 0) {
		if (max === rn) h = 60 * (((gn - bn) / delta) % 6)
		else if (max === gn) h = 60 * ((bn - rn) / delta + 2)
		else h = 60 * ((rn - gn) / delta + 4)
	}
	return {h: h < 0 ? h + 360 : h, s: max === 0 ? 0 : delta / max, v: max}
}
const wrapHue = (value: number) => ((value % 360) + 360) % 360
export const colorHsvToRgb = (hue: number, saturation: number, brightness: number): ColorRgb => {
	finite(hue, saturation, brightness)
	const h = wrapHue(hue), s = clamp(saturation), v = clamp(brightness)
	const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
	const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0]
		: h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
	return {r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255}
}
export const colorHsvToHex = (h: number, s: number, v: number) => {
	const rgb = colorHsvToRgb(h, s, v)
	return colorRgbToHex(rgb.r, rgb.g, rgb.b)
}
const stateFor = (value: string, draftValue = value): ColorPickerState => {
	const rgb = Object.freeze(colorHexToRgb(value))
	const hsv = Object.freeze(colorRgbToHsv(rgb.r, rgb.g, rgb.b))
	return {value, draftValue, rgb, hsv, hueColor: colorHsvToHex(hsv.h, 1, 1)}
}
type Surface = 'plane' | 'hue'

/** Value and editing owner; hosts compose their existing overlay, markup and styles. */
export function createColorPickerController(initial: ColorPickerOptions) {
	let options = {...initial}, disposed = false
	const fallback = normalizeHexColor(initial.fallbackValue ?? '#000000')
	if (!fallback) throw new RangeError('Expected a six-digit fallback color.')
	const store = createControllerStore(stateFor(normalizeHexColor(initial.value) ?? fallback))
	let pointer: {id: number; node: HTMLElement; surface: Surface} | null = null
	const clearPointer = () => {
		const previous = pointer
		pointer = null
		if (previous?.node.hasPointerCapture?.(previous.id))
			previous.node.releasePointerCapture(previous.id)
	}
	const setValue = (raw: string, {preserveDraft = false} = {}) => {
		if (disposed) return false
		const value = normalizeHexColor(raw)
		if (!value) return false
		const state = store.getState()
		if (value === state.value) {
			if (!preserveDraft && state.draftValue !== value) store.setState({draftValue: value})
			return true
		}
		store.setState(stateFor(value, preserveDraft ? state.draftValue : value))
		return true
	}
	const commit = (raw = store.getState().draftValue) => {
		if (disposed || options.disabled || !setValue(raw)) return false
		options.onChange?.(store.getState().value)
		return true
	}
	const available = () => !disposed && !options.disabled
	const rectFor = (event: PointerEvent, surface: Surface) => {
		const node = event.currentTarget as HTMLElement | null
		const rect = node?.getBoundingClientRect()
		return node && rect && Number.isFinite(rect.width) && rect.width > 0
   && (surface === 'hue' || Number.isFinite(rect.height) && rect.height > 0)
			? {node, rect} : null
	}
	const updatePointer = (event: PointerEvent, surface: Surface) => {
		const target = rectFor(event, surface)
		if (!target || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false
		const {rect} = target, hsv = store.getState().hsv
		const fraction = clamp((event.clientX - rect.left) / rect.width)
		return commit(surface === 'hue' ? colorHsvToHex(fraction * 360, hsv.s, hsv.v)
			: colorHsvToHex(hsv.h, fraction, 1 - clamp((event.clientY - rect.top) / rect.height)))
	}
	const pointerDown = (event: PointerEvent, surface: Surface) => {
		if (!available() || event.button !== 0 || pointer || !rectFor(event, surface)) return false
		const node = event.currentTarget as HTMLElement
		pointer = {id: event.pointerId, node, surface}
		node.setPointerCapture?.(event.pointerId)
		return updatePointer(event, surface)
	}
	const pointerMove = (event: PointerEvent, surface: Surface) => {
		if (!available() || !pointer || pointer.id !== event.pointerId || pointer.surface !== surface
   || pointer.node !== event.currentTarget) return false
		if (event.buttons !== 1) {clearPointer(); return false}
		return updatePointer(event, surface)
	}
	const pointerEnd = (event: PointerEvent) => {
		if (pointer?.id === event.pointerId) clearPointer()
	}
	const handlePlaneKeyDown = (event: KeyboardEvent) => {
		if (!available() || event.isComposing) return false
		const step = event.shiftKey ? 0.1 : 0.02
		const hsv = store.getState().hsv
		let s = hsv.s, v = hsv.v
		if (event.key === 'ArrowLeft') s -= step
		else if (event.key === 'ArrowRight') s += step
		else if (event.key === 'ArrowDown') v -= step
		else if (event.key === 'ArrowUp') v += step
		else if (event.key === 'Home') {s = 0; v = 1}
		else if (event.key === 'End') {s = 1; v = 0}
		else return false
		event.preventDefault()
		return commit(colorHsvToHex(hsv.h, clamp(s), clamp(v)))
	}
	const handleHueKeyDown = (event: KeyboardEvent) => {
		if (!available() || event.isComposing) return false
		const step = event.shiftKey || event.key === 'PageUp' || event.key === 'PageDown' ? 15 : 1
		const hsv = store.getState().hsv
		let h = hsv.h
		if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) h -= step
		else if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)) h += step
		else if (event.key === 'Home') h = 0
		else if (event.key === 'End') h = 359
		else return false
		event.preventDefault()
		return commit(colorHsvToHex(wrapHue(h), hsv.s, hsv.v))
	}
	return {
		getState: store.getState, subscribe: store.subscribe, setValue, commit,
		setDraft(value: string) {if (available()) store.setState({draftValue: value})},
		resetDraft() {if (!disposed) store.setState({draftValue: store.getState().value})},
		configure(next: Partial<Pick<ColorPickerOptions, 'value' | 'disabled'>>) {
			if (disposed) return
			options = {...options, ...next}
			if (options.disabled) clearPointer()
			if (next.value !== undefined) setValue(next.value)
		},
		handlePlaneKeyDown, handleHueKeyDown,
		handleHexKeyDown(event: KeyboardEvent) {
			if (!available() || event.isComposing || event.key !== 'Enter') return false
			event.preventDefault(); return commit()
		},
		handlePlanePointerDown: (event: PointerEvent) => pointerDown(event, 'plane'),
		handleHuePointerDown: (event: PointerEvent) => pointerDown(event, 'hue'),
		handlePlanePointerMove: (event: PointerEvent) => pointerMove(event, 'plane'),
		handleHuePointerMove: (event: PointerEvent) => pointerMove(event, 'hue'),
		handlePointerEnd: pointerEnd,
		cancelPointer() {if (!disposed) clearPointer()},
		destroy() {disposed = true; clearPointer(); store.clear()}
	}
}
export type ColorPickerController = ReturnType<typeof createColorPickerController>
