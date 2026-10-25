import * as Y from 'yjs'

/** Small replacements preserve concurrent item identities; assigning the entire
 * string on every input would turn independent typing into competing rewrites. */
export function textReplacement(before: string, after: string) {
	let start = 0,
		endBefore = before.length,
		endAfter = after.length
	while (start < endBefore && start < endAfter && before[start] === after[start]) start++
	if (start && start < before.length && /[\uDC00-\uDFFF]/.test(before.charAt(start))) start--
	while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
		endBefore--
		endAfter--
	}
	if (endBefore < before.length && /[\uDC00-\uDFFF]/.test(before.charAt(endBefore))) {
		endBefore++
		endAfter++
	}
	return {start, remove: endBefore - start, insert: after.slice(start, endAfter)}
}

/** Native inputs/textareas keep their normal IME and accessibility behavior.
 * Remote edits move the selection through Yjs relative positions. Composition
 * runs against its starting document and merges as a CRDT update, preserving
 * remote insertions even inside a concurrently replaced selection. */
export type TextBindingOptions = {origin?: object; undo?: Y.UndoManager}
interface TextControl {
	value: string
	readonly selectionStart: number | null
	readonly selectionEnd: number | null
	readonly selectionDirection: 'forward' | 'backward' | 'none' | null
	setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void
}
export function bindCollaborativeTextInput(
	element: HTMLInputElement | HTMLTextAreaElement,
	text: Y.Text,
	options: TextBindingOptions = {}
) {
	return bindCollaborativeTextControl(element, element, text, options)
}
export function bindCollaborativeTextEditable(
	element: HTMLElement,
	text: Y.Text,
	options: TextBindingOptions = {}
) {
	const offsets = () => {
		const selected = element.ownerDocument.getSelection()
		if (
			!selected?.anchorNode ||
			!selected.focusNode ||
			!element.contains(selected.anchorNode) ||
			!element.contains(selected.focusNode)
		)
			return {anchor: 0, head: 0}
		const range = element.ownerDocument.createRange()
		range.selectNodeContents(element)
		range.setEnd(selected.anchorNode, selected.anchorOffset)
		const anchor = range.toString().length
		range.selectNodeContents(element)
		range.setEnd(selected.focusNode, selected.focusOffset)
		return {anchor, head: range.toString().length}
	}
	const point = (offset: number) => {
		const walker = element.ownerDocument.createTreeWalker(element, 4)
		let node: Node | null,
			last: Node | null = null,
			remaining = Math.max(0, offset)
		while ((node = walker.nextNode())) {
			last = node
			const length = node.textContent?.length ?? 0
			if (remaining <= length) return {node, offset: remaining}
			remaining -= length
		}
		if (!last) {
			last = element.ownerDocument.createTextNode('')
			element.append(last)
		}
		return {node: last, offset: last.textContent?.length ?? 0}
	}
	const control: TextControl = {
		get value() {
			return element.textContent ?? ''
		},
		set value(value) {
			element.textContent = value
		},
		get selectionStart() {
			const value = offsets()
			return Math.min(value.anchor, value.head)
		},
		get selectionEnd() {
			const value = offsets()
			return Math.max(value.anchor, value.head)
		},
		get selectionDirection() {
			const value = offsets()
			return value.anchor > value.head ? 'backward' : 'forward'
		},
		setSelectionRange(start, end, direction = 'forward') {
			const anchor = point(direction === 'backward' ? end : start),
				head = point(direction === 'backward' ? start : end)
			element.ownerDocument
				.getSelection()
				?.setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset)
		}
	}
	return bindCollaborativeTextControl(element, control, text, options)
}
function bindCollaborativeTextControl(
	element: HTMLElement,
	control: TextControl,
	text: Y.Text,
	options: TextBindingOptions
) {
	const doc = text.doc
	if (!doc) throw new Error('Attach collaborative text to its document first.')
	const key = [...doc.share].find(([, value]) => Object.is(value, text))?.[0]
	if (key === undefined) throw new Error('Native collaborative inputs require a root Y.Text.')
	const origin = options.origin ?? {},
		undo = options.undo ?? new Y.UndoManager(text, {trackedOrigins: new Set([origin])})
	let composing: Y.Doc | undefined
	let selection:
		| {
			anchor: Y.RelativePosition
			head: Y.RelativePosition
			direction: 'forward' | 'backward' | 'none'
		}
		| undefined
	const render = () => {
		if (!composing) control.value = text.toString()
	}
	const before = (transaction: Y.Transaction) => {
		if (
			composing ||
			transaction.origin === origin ||
			element.ownerDocument.activeElement !== element ||
			control.selectionStart === null ||
			control.selectionEnd === null
		)
			return
		selection = {
			anchor: Y.createRelativePositionFromTypeIndex(text, control.selectionStart ?? 0),
			head: Y.createRelativePositionFromTypeIndex(text, control.selectionEnd ?? 0),
			direction: control.selectionDirection ?? 'none'
		}
	}
	const observe = (_event: Y.YTextEvent, transaction: Y.Transaction) => {
		if (composing) return
		if (transaction.origin === origin) {
			if (control.value !== text.toString()) render()
			return
		}
		render()
		if (selection) {
			const anchor = Y.createAbsolutePositionFromRelativePosition(selection.anchor, doc),
				head = Y.createAbsolutePositionFromRelativePosition(selection.head, doc)
			if (anchor && head) control.setSelectionRange(anchor.index, head.index, selection.direction)
		}
		selection = undefined
	}
	const replace = (target: Y.Text, value: string, targetDoc: Y.Doc) => {
		const change = textReplacement(target.toString(), value)
		if (!change.remove && !change.insert) return
		targetDoc.transact(() => {
			if (change.remove) target.delete(change.start, change.remove)
			if (change.insert) target.insert(change.start, change.insert)
		}, origin)
	}
	const input = () => {
		if (!composing) replace(text, control.value, doc)
	}
	const compositionStart = () => {
		composing?.destroy()
		composing = new Y.Doc()
		Y.applyUpdate(composing, Y.encodeStateAsUpdate(doc))
		undo.stopCapturing()
	}
	const compositionEnd = () => {
		if (!composing) return
		const snapshot = composing,
			vector = Y.encodeStateVector(snapshot)
		const target = snapshot.getText(key)
		// Native scalar bindings use root Y.Text values, never nested builder nodes.
		replace(target, control.value, snapshot)
		const caret = Y.createRelativePositionFromTypeIndex(
			target,
			control.selectionEnd ?? target.length
		)
		composing = undefined
		Y.applyUpdate(doc, Y.encodeStateAsUpdate(snapshot, vector), origin)
		render()
		const position = Y.createAbsolutePositionFromRelativePosition(caret, doc)
		if (position && control.selectionStart !== null)
			control.setSelectionRange(position.index, position.index)
		snapshot.destroy()
		undo.stopCapturing()
	}
	const keydown = (event: Event) => {
		const keyboard = event as KeyboardEvent
		if (typeof keyboard.key !== 'string') return
		if (composing || !(keyboard.ctrlKey || keyboard.metaKey) || keyboard.altKey) return
		const key = keyboard.key.toLowerCase()
		if (key === 'z' || (key === 'y' && keyboard.ctrlKey)) {
			keyboard.preventDefault()
			if (keyboard.shiftKey || key === 'y') undo.redo()
			else undo.undo()
			render()
		}
	}
	render()
	doc.on('beforeTransaction', before)
	text.observe(observe)
	element.addEventListener('input', input)
	element.addEventListener('compositionstart', compositionStart)
	element.addEventListener('compositionend', compositionEnd)
	element.addEventListener('keydown', keydown)
	let destroyed = false
	return {
		undo,
		origin,
		destroy() {
			if (destroyed) return
			destroyed = true
			composing?.destroy()
			if (!options.undo) undo.destroy()
			doc.off('beforeTransaction', before)
			text.unobserve(observe)
			element.removeEventListener('input', input)
			element.removeEventListener('compositionstart', compositionStart)
			element.removeEventListener('compositionend', compositionEnd)
			element.removeEventListener('keydown', keydown)
		}
	}
}
