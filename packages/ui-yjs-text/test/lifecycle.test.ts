// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'
import * as Y from 'yjs'

import {bindCollaborativeTextEditable, bindCollaborativeTextInput} from '../src/index'
const releases: (() => void)[] = []
afterEach(() => {
	for (const release of releases.splice(0).reverse()) release()
	document.body.innerHTML = ''
})
function pair(kind: 'input' | 'textarea' = 'input') {
	const a = new Y.Doc(),
		b = new Y.Doc()
	a.getText('content').insert(0, 'Seed')
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
	const one = document.createElement(kind),
		two = document.createElement(kind)
	document.body.append(one, two)
	const first = bindCollaborativeTextInput(one, a.getText('content')),
		second = bindCollaborativeTextInput(two, b.getText('content'))
	releases.push(() => {
		first.destroy()
		second.destroy()
		a.destroy()
		b.destroy()
	})
	return {a, b, one, two, first, second}
}
it.each(['input', 'textarea'] as const)(
	'reconnects offline %s peers and keeps undo per user',
	(kind) => {
		const {a, b, one, two} = pair(kind)
		one.value = 'Alice Seed'
		one.dispatchEvent(new InputEvent('input'))
		two.value = 'Seed Bob'
		two.dispatchEvent(new InputEvent('input'))
		const fromA = Y.encodeStateAsUpdate(a),
			fromB = Y.encodeStateAsUpdate(b)
		Y.applyUpdate(a, fromB)
		Y.applyUpdate(b, fromA)
		expect(one.value).toBe('Alice Seed Bob')
		expect(two.value).toBe(one.value)
		one.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, cancelable: true}))
		Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
		expect(two.value).toBe('Seed Bob')
		two.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, cancelable: true}))
		Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
		expect(one.value).toBe('Seed')
	}
)
it('preserves backward selection direction through remote edits', () => {
	const {a, b, one} = pair()
	one.focus()
	one.setSelectionRange(1, 3, 'backward')
	b.getText('content').insert(0, 'Peer ')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect([one.selectionStart, one.selectionEnd, one.selectionDirection]).toEqual([6, 8, 'backward'])
})
it('never destroys an external undo manager and supports redo shortcuts', () => {
	const doc = new Y.Doc(),
		text = doc.getText('content'),
		origin = {},
		undo = new Y.UndoManager(text, {trackedOrigins: new Set([origin])}),
		destroy = vi.spyOn(undo, 'destroy')
	const input = document.createElement('input')
	document.body.append(input)
	const binding = bindCollaborativeTextInput(input, text, {origin, undo})
	releases.push(() => {
		undo.destroy()
		doc.destroy()
	})
	input.value = 'Owned'
	input.dispatchEvent(new InputEvent('input'))
	input.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, altKey: true}))
	expect(text.toString()).toBe('Owned')
	input.dispatchEvent(new KeyboardEvent('keydown', {key: 'x', ctrlKey: true}))
	expect(text.toString()).toBe('Owned')
	input.dispatchEvent(new Event('keydown'))
	input.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true}))
	expect(input.value).toBe('')
	input.dispatchEvent(new KeyboardEvent('keydown', {key: 'y', ctrlKey: true}))
	expect(input.value).toBe('Owned')
	binding.destroy()
	binding.destroy()
	expect(destroy).not.toHaveBeenCalled()
	expect(binding.origin).toBe(origin)
})
it('destroys an owned undo manager only once and ignores all later UI events', () => {
	const {a, one, first} = pair(),
		destroy = vi.spyOn(first.undo, 'destroy')
	first.destroy()
	first.destroy()
	expect(destroy).toHaveBeenCalledOnce()
	one.value = 'Detached'
	one.dispatchEvent(new InputEvent('input'))
	one.dispatchEvent(new CompositionEvent('compositionstart'))
	one.dispatchEvent(new CompositionEvent('compositionend'))
	expect(a.getText('content').toString()).toBe('Seed')
})
it('requires an attached root Y.Text but permits an empty root name', () => {
	const input = document.createElement('input'),
		doc = new Y.Doc()
	releases.push(() => doc.destroy())
	expect(() => bindCollaborativeTextInput(input, new Y.Text())).toThrow('Attach')
	const nested = new Y.Text()
	doc.getMap('map').set('nested', nested)
	expect(() => bindCollaborativeTextInput(input, nested)).toThrow('root Y.Text')
	const binding = bindCollaborativeTextInput(input, doc.getText(''))
	binding.destroy()
})
it('synchronizes non-selectable inputs without unsupported cursor operations', () => {
	const {a, b, one} = pair()
	one.type = 'email'
	one.focus()
	b.getText('content').insert(0, 'Peer ')
	expect(() => Y.applyUpdate(a, Y.encodeStateAsUpdate(b))).not.toThrow()
	expect(one.value).toBe('Peer Seed')
	one.dispatchEvent(new CompositionEvent('compositionend'))
	one.dispatchEvent(new CompositionEvent('compositionstart'))
	one.value = 'Composed'
	one.dispatchEvent(new CompositionEvent('compositionend'))
	expect(one.value).toBe('Composed')
})
it('does not process local keyboard undo until an IME composition finishes', () => {
	const {a, one} = pair()
	one.dispatchEvent(new CompositionEvent('compositionstart'))
	one.value = '世界'
	one.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true}))
	expect(one.value).toBe('世界')
	one.dispatchEvent(new InputEvent('input'))
	expect(a.getText('content').toString()).toBe('Seed')
	one.dispatchEvent(new CompositionEvent('compositionend'))
	expect(a.getText('content').toString()).toBe('世界')
})
it('cleans up a composing view and accepts a fresh binding on the retained document', () => {
	const {a, one, first} = pair()
	one.dispatchEvent(new CompositionEvent('compositionstart'))
	one.value = 'Uncommitted composition'
	first.destroy()
	const next = bindCollaborativeTextInput(one, a.getText('content'))
	releases.push(next.destroy)
	expect(one.value).toBe('Seed')
})
it('keeps an external selection outside an inline editable and handles empty DOM text', () => {
	const doc = new Y.Doc(),
		text = doc.getText('content'),
		element = document.createElement('span'),
		other = document.createElement('input')
	element.contentEditable = 'true'
	element.tabIndex = 0
	document.body.append(element, other)
	const binding = bindCollaborativeTextEditable(element, text)
	releases.push(() => {
		binding.destroy()
		doc.destroy()
	})
	other.focus()
	text.insert(0, 'Remote')
	expect(document.activeElement).toBe(other)
	expect(element.textContent).toBe('Remote')
	element.focus()
	element.textContent = ''
	window.getSelection()?.removeAllRanges()
	element.dispatchEvent(new CompositionEvent('compositionstart'))
	element.dispatchEvent(new CompositionEvent('compositionend'))
	expect(text.toString()).toBe('')
	expect(element.firstChild?.nodeType).toBe(Node.TEXT_NODE)
})
it('maps nested inline selection and a caret beyond text back to valid text nodes', () => {
	const doc = new Y.Doc(),
		text = doc.getText('content'),
		element = document.createElement('span')
	text.insert(0, 'Seed')
	element.contentEditable = 'true'
	element.tabIndex = 0
	document.body.append(element)
	const binding = bindCollaborativeTextEditable(element, text)
	releases.push(() => {
		binding.destroy()
		doc.destroy()
	})
	element.focus()
	element.innerHTML = '<b>Se</b><i>ed</i>'
	window
		.getSelection()!
		.setBaseAndExtent(element.firstChild!.firstChild!, 1, element.lastChild!.firstChild!, 1)
	text.insert(0, 'Peer ')
	expect(element.textContent).toBe('Peer Seed')
	expect(window.getSelection()?.anchorOffset).toBe(6)
	expect(window.getSelection()?.focusOffset).toBe(8)
})
it('keeps a backward inline selection through a remote insertion', () => {
	const doc = new Y.Doc(),
		text = doc.getText('content'),
		element = document.createElement('span')
	text.insert(0, 'Start')
	element.contentEditable = 'true'
	element.tabIndex = 0
	document.body.append(element)
	const binding = bindCollaborativeTextEditable(element, text)
	releases.push(() => {
		binding.destroy()
		doc.destroy()
	})
	element.focus()
	window.getSelection()!.setBaseAndExtent(element.firstChild!, 4, element.firstChild!, 2)
	text.insert(0, 'Peer ')
	expect(window.getSelection()?.anchorOffset).toBe(9)
	expect(window.getSelection()?.focusOffset).toBe(7)
})
it('does not create a transaction for an unchanged native input event', () => {
	const {a, one} = pair(),
		transactions = vi.fn()
	a.on('afterTransaction', transactions)
	one.dispatchEvent(new InputEvent('input'))
	expect(transactions).not.toHaveBeenCalled()
})
