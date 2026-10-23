// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'

import {
	createColorPickerController, normalizeHexColor, colorHexToRgb, colorRgbToHex,
	colorRgbToHsv, colorHsvToRgb, colorHsvToHex
} from '../src/index'

afterEach(() => {document.body.innerHTML = ''})
function setup(value = '#14b8a6', disabled = false) {
	const onChange = vi.fn(), owner = createColorPickerController({value, disabled, onChange})
	const node = document.createElement('div'), other = document.createElement('div')
	document.body.append(node, other)
	let width = 100, height = 100
	node.getBoundingClientRect = () => ({left: 10, top: 20, width, height} as DOMRect)
	other.getBoundingClientRect = node.getBoundingClientRect
	const captured = new Set<number>()
	node.setPointerCapture = vi.fn((id) => {captured.add(id)})
	node.hasPointerCapture = (id) => captured.has(id)
	node.releasePointerCapture = vi.fn((id) => {captured.delete(id)})
	const pointer = (overrides: Record<string, unknown> = {}, target: HTMLElement | null = node) => {
		const event = new MouseEvent('pointerdown', {
			clientX: 60, clientY: 70, button: 0, buttons: 1, cancelable: true
		}) as PointerEvent
		Object.defineProperties(event, Object.fromEntries(Object.entries({
			pointerId: 1, currentTarget: target, ...overrides
		}).map(([key, value]) => [key, {value}])))
		return event
	}
	const key = (name: string, shift = false, composing = false) => new KeyboardEvent('keydown', {
		key: name, shiftKey: shift, isComposing: composing, cancelable: true
	})
	return {owner, onChange, node, other, pointer, key,
		size: (w: number, h: number) => {width = w; height = h}}
}
it('normalizes six-digit colors while rejecting incomplete or unrelated values', () => {
	expect(normalizeHexColor(' ABCDef ')).toBe('#abcdef')
	expect(normalizeHexColor(' #ABCDef ')).toBe('#abcdef')
	for (const value of ['', '#abc', '#abcdef00', 'red', 'var(--accent)', '#abcdeg'])
		expect(normalizeHexColor(value)).toBeNull()
	expect(() => colorHexToRgb('bad')).toThrow('six-digit')
})
it('round trips RGB colors through HEX and all HSV sectors without drift', () => {
	for (const r of [0, 1, 64, 127, 254, 255])
		for (const g of [0, 64, 127, 255]) for (const b of [0, 64, 127, 255]) {
			const hex = colorRgbToHex(r, g, b), rgb = colorHexToRgb(hex)
			expect(rgb).toEqual({r, g, b})
			const hsv = colorRgbToHsv(r, g, b)
			expect(colorHsvToHex(hsv.h, hsv.s, hsv.v)).toBe(hex)
		}
	expect(colorHsvToHex(360, 1, 1)).toBe('#ff0000')
	expect(colorHsvToHex(-60, 1, 1)).toBe('#ff00ff')
	expect(colorRgbToHex(-1, 300, 12.6)).toBe('#00ff0d')
	expect(colorHsvToRgb(0, -1, 2)).toEqual({r: 255, g: 255, b: 255})
	for (const convert of [colorRgbToHex, colorRgbToHsv, colorHsvToRgb])
		expect(() => convert(NaN, 1, 1)).toThrow('finite')
})
it('owns immutable projections, controlled updates and invalid drafts without user callbacks', () => {
	const {owner, onChange} = setup()
	expect(Object.isFrozen(owner.getState().rgb)).toBe(true)
	expect(Object.isFrozen(owner.getState().hsv)).toBe(true)
	owner.setDraft('bad'); expect(owner.commit()).toBe(false)
	expect(owner.getState().value).toBe('#14b8a6'); expect(owner.getState().draftValue).toBe('bad')
	owner.setValue('#ABCDEF', {preserveDraft: true})
	expect(owner.getState().value).toBe('#abcdef'); expect(owner.getState().draftValue).toBe('bad')
	owner.resetDraft(); expect(owner.getState().draftValue).toBe('#abcdef')
	owner.configure({value: '#ffffff'}); expect(owner.getState().draftValue).toBe('#ffffff')
	expect(owner.setValue('bad')).toBe(false); expect(onChange).not.toHaveBeenCalled()
	owner.destroy()
})
it('commits exactly once per accepted action, including an explicit identical swatch', () => {
	const {owner, onChange} = setup()
	owner.setDraft('ABCDEF'); expect(owner.commit()).toBe(true)
	expect(onChange).toHaveBeenCalledExactlyOnceWith('#abcdef')
	owner.commit('#abcdef'); expect(onChange).toHaveBeenCalledTimes(2)
	owner.destroy()
})
it('supports a neutral fallback and validates an explicitly supplied fallback', () => {
	const owner = createColorPickerController({value: 'bad'})
	expect(owner.getState().value).toBe('#000000'); owner.destroy()
	const custom = createColorPickerController({value: 'bad', fallbackValue: '#ABCDEF'})
	expect(custom.getState().value).toBe('#abcdef'); custom.destroy()
	expect(() => createColorPickerController({value: 'bad', fallbackValue: 'bad'})).toThrow('fallback')
})
it('retains plane arrow steps, shift steps, Home/End and clamped boundaries', () => {
	const {owner, key, onChange} = setup('#ff0000')
	for (const [name, shift] of [['Home', false], ['ArrowRight', true], ['ArrowDown', false],
		['ArrowLeft', false], ['ArrowUp', true], ['End', false], ['ArrowDown', true]] as const) {
		const event = key(name, shift); expect(owner.handlePlaneKeyDown(event)).toBe(true)
		expect(event.defaultPrevented).toBe(true)
	}
	expect(owner.getState().value).toBe('#000000'); expect(onChange).toHaveBeenCalledTimes(7)
	const event = key('Tab'); expect(owner.handlePlaneKeyDown(event)).toBe(false)
	expect(event.defaultPrevented).toBe(false); owner.destroy()
})
it('retains hue arrows, page/shift steps, Home/End and circular wrapping', () => {
	const {owner, key, onChange} = setup('#ff0000')
	for (const name of ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp',
		'PageDown', 'PageUp', 'Home', 'End']) {
		const event = key(name); expect(owner.handleHueKeyDown(event)).toBe(true)
		expect(event.defaultPrevented).toBe(true)
	}
	owner.handleHueKeyDown(key('ArrowRight', true))
	expect(onChange).toHaveBeenCalledTimes(9)
	const event = key('Escape'); expect(owner.handleHueKeyDown(event)).toBe(false)
	expect(event.defaultPrevented).toBe(false); owner.destroy()
})
it('keeps Hex Enter local, permits blur commits and ignores IME or unrelated keys', () => {
	const {owner, key, onChange} = setup()
	owner.setDraft('ABCDEF'); const event = key('Enter')
	expect(owner.handleHexKeyDown(event)).toBe(true); expect(event.defaultPrevented).toBe(true)
	owner.setDraft('#fedcba'); expect(owner.handleHexKeyDown(key('Enter', false, true))).toBe(false)
	expect(owner.handleHexKeyDown(key('Tab'))).toBe(false)
	expect(owner.handlePlaneKeyDown(key('ArrowRight', false, true))).toBe(false)
	expect(owner.handleHueKeyDown(key('ArrowRight', false, true))).toBe(false)
	owner.commit(); expect(onChange).toHaveBeenCalledTimes(2); owner.destroy()
})
it('maps plane dragging through capture, clamps edges and ends without a second commit', () => {
	const {owner, pointer, node, onChange} = setup('#ff0000')
	expect(owner.handlePlanePointerDown(pointer())).toBe(true)
	expect(node.setPointerCapture).toHaveBeenCalledWith(1)
	expect(owner.getState().value).toBe('#804040')
	expect(owner.handlePlanePointerMove(pointer({clientX: 200, clientY: -50}))).toBe(true)
	expect(owner.getState().value).toBe('#ff0000')
	owner.handlePointerEnd(pointer()); expect(node.releasePointerCapture).toHaveBeenCalledWith(1)
	expect(owner.handlePlanePointerMove(pointer())).toBe(false)
	expect(onChange).toHaveBeenCalledTimes(2); owner.destroy()
})
it('maps hue dragging and ignores other pointers, targets and surfaces', () => {
	const {owner, pointer, other, onChange} = setup('#ff0000')
	owner.handleHuePointerDown(pointer()); expect(owner.getState().value).toBe('#00ffff')
	expect(owner.handleHuePointerDown(pointer())).toBe(false)
	expect(owner.handleHuePointerMove(pointer({pointerId: 2}))).toBe(false)
	expect(owner.handlePlanePointerMove(pointer())).toBe(false)
	expect(owner.handleHuePointerMove(pointer({}, other))).toBe(false)
	owner.handlePointerEnd(pointer({pointerId: 2}))
	expect(owner.handleHuePointerMove(pointer({clientX: 110}))).toBe(true)
	expect(owner.getState().value).toBe('#ff0000'); owner.handlePointerEnd(pointer())
	expect(onChange).toHaveBeenCalledTimes(2); owner.destroy()
})
it('rejects nonprimary/missing/zero-sized/nonfinite pointer input and released buttons', () => {
	const {owner, pointer, size, onChange} = setup()
	expect(owner.handlePlanePointerDown(pointer({button: 2}))).toBe(false)
	expect(owner.handlePlanePointerDown(pointer({}, null))).toBe(false)
	size(0, 100); expect(owner.handleHuePointerDown(pointer())).toBe(false)
	size(100, 0); expect(owner.handlePlanePointerDown(pointer())).toBe(false)
	expect(owner.handleHuePointerDown(pointer())).toBe(true)
	expect(owner.handleHuePointerMove(pointer({clientX: NaN}))).toBe(false)
	expect(owner.handleHuePointerMove(pointer({clientY: NaN}))).toBe(false)
	expect(owner.handleHuePointerMove(pointer({buttons: 0}))).toBe(false)
	owner.handlePointerEnd(pointer())
	expect(onChange).toHaveBeenCalledTimes(1); owner.destroy()
})
it('guards disabled controls and releases an active capture when disabling or destroying', () => {
	const {owner, pointer, key, node, onChange} = setup('#123456', true)
	expect(owner.commit('#abcdef')).toBe(false); owner.setDraft('bad')
	expect(owner.getState().draftValue).toBe('#123456')
	for (const action of [owner.handlePlaneKeyDown, owner.handleHueKeyDown, owner.handleHexKeyDown])
		expect(action(key('Enter'))).toBe(false)
	expect(owner.handlePlanePointerDown(pointer())).toBe(false)
	expect(owner.handleHuePointerMove(pointer())).toBe(false)
	owner.configure({disabled: false}); owner.handlePlanePointerDown(pointer())
	owner.configure({disabled: true}); expect(node.releasePointerCapture).toHaveBeenCalledTimes(1)
	owner.configure({disabled: false}); owner.handleHuePointerDown(pointer())
	const subscriber = vi.fn(); owner.subscribe(subscriber); owner.destroy()
	expect(node.releasePointerCapture).toHaveBeenCalledTimes(2)
	const calls = subscriber.mock.calls.length, changes = onChange.mock.calls.length
	owner.setDraft('bad'); owner.resetDraft(); owner.setValue('#ffffff'); owner.configure({value: '#ffffff'})
	owner.commit('#ffffff'); owner.handlePointerEnd(pointer())
	expect(subscriber).toHaveBeenCalledTimes(calls); expect(onChange).toHaveBeenCalledTimes(changes)
})
it('cancels a drag without committing and can start a fresh interaction', () => {
	const {owner, pointer, onChange, size} = setup('#ff0000')
	owner.handlePlanePointerDown(pointer()); owner.cancelPointer()
	expect(owner.handlePlanePointerMove(pointer())).toBe(false)
	owner.handlePlanePointerDown(pointer()); owner.handlePointerEnd(pointer())
	expect(onChange).toHaveBeenCalledTimes(2)
	size(Infinity, 100); expect(owner.handleHuePointerDown(pointer())).toBe(false)
	size(100, NaN); expect(owner.handlePlanePointerDown(pointer())).toBe(false)
	owner.destroy(); owner.cancelPointer()
})
it('keeps unchanged controlled echoes from rebuilding the rendered color projection', () => {
	const {owner, onChange} = setup('#abcdef'), subscriber = vi.fn()
	owner.subscribe(subscriber)
	const hsv = owner.getState().hsv
	owner.setValue('#abcdef'); owner.setValue('#ABCDEF', {preserveDraft: true})
	expect(subscriber).toHaveBeenCalledTimes(1); expect(owner.getState().hsv).toBe(hsv)
	owner.setDraft('bad'); owner.setValue('#abcdef', {preserveDraft: true})
	expect(owner.getState().draftValue).toBe('bad')
	owner.setValue('#abcdef'); expect(owner.getState().draftValue).toBe('#abcdef')
	expect(owner.getState().hsv).toBe(hsv); expect(onChange).not.toHaveBeenCalled(); owner.destroy()
})
