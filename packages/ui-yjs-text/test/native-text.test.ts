// @vitest-environment jsdom
import {afterEach, expect, it} from 'vitest'
import * as Y from 'yjs'

import {bindCollaborativeTextInput, textReplacement} from '../src/index'
const releases: (() => void)[] = []
afterEach(() => {
	for (const release of releases.splice(0).reverse()) release()
	document.body.innerHTML = ''
})
function setup(value = 'Start') {
	const a = new Y.Doc(),
		b = new Y.Doc()
	a.getText('content').insert(0, value)
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
	const input = document.createElement('textarea')
	document.body.append(input)
	const binding = bindCollaborativeTextInput(input, a.getText('content'))
	releases.push(() => {
		binding.destroy()
		a.destroy()
		b.destroy()
	})
	return {a, b, input, binding}
}
it.each([
	['Start', 'First Start'],
	['hello world', 'hello Earth'],
	['αβγ', 'αδγ'],
	['😀!', '😁!'],
	['X😀', 'X😁'],
	['', 'x'],
	['abc', '']
])('replaces only the changed text in %s -> %s without splitting emoji', (before, after) => {
	const change = textReplacement(before, after)
	expect(
		before.slice(0, change.start) + change.insert + before.slice(change.start + change.remove)
	).toBe(after)
	if (change.insert.length) expect(change.insert).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/)
})
it('merges independent native input typing and preserves the remote insertion through local undo', () => {
	const {a, b, input} = setup()
	input.value = 'Alice Start'
	input.dispatchEvent(new InputEvent('input'))
	b.getText('content').insert(5, ' Bob')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect(input.value).toBe('Alice Start Bob')
	input.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, cancelable: true}))
	expect(input.value).toBe('Start Bob')
	input.dispatchEvent(
		new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, shiftKey: true, cancelable: true})
	)
	expect(input.value).toBe('Alice Start Bob')
})
it('moves a focused selection after remote typing ahead of the caret', () => {
	const {a, b, input} = setup()
	input.focus()
	input.setSelectionRange(2, 4)
	b.getText('content').insert(0, 'Prefix ')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect(input.value).toBe('Prefix Start')
	expect([input.selectionStart, input.selectionEnd]).toEqual([9, 11])
})
it('preserves remote text while composing and merges composition after a remote insertion inside the replaced range', () => {
	const {a, b, input} = setup('hello')
	input.focus()
	input.setSelectionRange(0, 5)
	input.dispatchEvent(new CompositionEvent('compositionstart'))
	input.value = 'γειά'
	input.dispatchEvent(new InputEvent('input', {isComposing: true}))
	b.getText('content').insert(2, ' remote ')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect(input.value).toBe('γειά') // The browser composition must not be replaced.
	input.setSelectionRange(4, 4)
	input.dispatchEvent(new CompositionEvent('compositionend'))
	expect(a.getText('content').toString()).toContain('γειά')
	expect(a.getText('content').toString()).toContain(' remote ')
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
	expect(b.getText('content').toString()).toBe(input.value)
})
it('removes all event observers when navigating away', () => {
	const {a, b, input, binding} = setup()
	binding.destroy()
	input.value = 'Departed'
	input.dispatchEvent(new InputEvent('input'))
	expect(a.getText('content').toString()).toBe('Start')
	b.getText('content').insert(0, 'Remote ')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect(input.value).toBe('Departed')
})

it('keeps inline contenteditable typing, remote caret mapping and local undo on the same scalar binding', async() => {
	const {bindCollaborativeTextEditable} = await import('../src/index'),
		a = new Y.Doc(),
		b = new Y.Doc()
	a.getText('content').insert(0, 'Start')
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
	const element = document.createElement('span')
	element.contentEditable = 'true'
	element.tabIndex = 0
	document.body.append(element)
	const binding = bindCollaborativeTextEditable(element, a.getText('content'))
	releases.push(() => {
		binding.destroy()
		a.destroy()
		b.destroy()
	})
	element.focus()
	element.textContent = 'Alice Start'
	element.dispatchEvent(new InputEvent('input'))
	const node = element.firstChild!
	window.getSelection()!.setBaseAndExtent(node, 2, node, 4)
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
	b.getText('content').insert(0, 'Peer ')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect(element.textContent).toBe('Peer Alice Start')
	const selection = window.getSelection()!
	expect(selection.anchorOffset).toBe(7)
	expect(selection.focusOffset).toBe(9)
	element.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, cancelable: true}))
	expect(element.textContent).toBe('Peer Start')
	element.dispatchEvent(
		new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, shiftKey: true, cancelable: true})
	)
	expect(element.textContent).toBe('Peer Alice Start')
})
it('composes inline labels against their starting branch without losing remote Unicode insertions', async() => {
	const {bindCollaborativeTextEditable} = await import('../src/index'),
		a = new Y.Doc(),
		b = new Y.Doc()
	a.getText('content').insert(0, 'Hello')
	Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
	const element = document.createElement('span')
	element.contentEditable = 'true'
	element.tabIndex = 0
	document.body.append(element)
	const binding = bindCollaborativeTextEditable(element, a.getText('content'))
	releases.push(() => {
		binding.destroy()
		a.destroy()
		b.destroy()
	})
	element.focus()
	element.dispatchEvent(new CompositionEvent('compositionstart'))
	element.textContent = 'Hello 世界'
	window.getSelection()!.collapse(element.firstChild!, 8)
	b.getText('content').insert(0, '😀 ')
	Y.applyUpdate(a, Y.encodeStateAsUpdate(b))
	expect(element.textContent).toBe('Hello 世界')
	element.dispatchEvent(new CompositionEvent('compositionend'))
	expect(element.textContent).toBe('😀 Hello 世界')
	expect(a.getText('content').toString()).toBe('😀 Hello 世界')
})
