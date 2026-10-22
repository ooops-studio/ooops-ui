import {cleanup, fireEvent, render, waitFor} from '@testing-library/svelte'
import type {Editor} from '@tiptap/core'
import {ySyncPluginKey} from '@tiptap/y-tiptap'
import {afterEach, expect, it, vi} from 'vitest'
import * as Y from 'yjs'

import RichTextEditor from '../src/lib/RichTextEditor.svelte'
import {observeRichTextToolbar} from '../src/lib/toolbar-state.js'

import Host from './EditorHost.svelte'

afterEach(cleanup)

it('keeps the same view when controlled HTML and readonly props change', async() => {
	const view = render(RichTextEditor, {props: {html: '<p>Original</p>'}})
	const textbox = await view.findByRole('textbox', {name: 'Rich text editor'})
	await waitFor(() => expect(textbox.textContent).toBe('Original'))
	await view.rerender({html: '<p>Restored</p>', readOnly: true})
	await waitFor(() => expect(textbox.textContent).toBe('Restored'))
	expect(view.getByRole('textbox', {name: 'Rich text editor'})).toBe(textbox)
	expect(textbox.getAttribute('contenteditable')).toBe('false')
})

async function mount(props: Partial<import('svelte').ComponentProps<typeof Host>> = {}) {
	const capture = {editor: null as Editor | null}
	const view = render(Host, {props: {capture, ...props}})
	await waitFor(() => expect(capture.editor).not.toBeNull())
	await waitFor(() => expect(capture.editor!.isInitialized).toBe(true))
	return {view, editor: capture.editor!, capture}
}

it('standalone preserves source normalization, silent external updates, readonly and ordinary undo', async() => {
	const onChange = vi.fn()
	const {view, editor} = await mount({initial: '<ul><li>Imported</li></ul>', onChange})
	expect(editor.getHTML()).toContain('<li><p>Imported</p></li>')
	expect(view.getByLabelText('HTML').textContent).toBe('<ul><li>Imported</li></ul>')
	expect(onChange).not.toHaveBeenCalled()
	await fireEvent.click(view.getByRole('button', {name: 'External HTML'}))
	await waitFor(() => expect(editor.getText()).toBe('External source'))
	expect(onChange).not.toHaveBeenCalled()
	await fireEvent.click(view.getByRole('button', {name: 'Toggle readonly'}))
	expect(editor.isEditable).toBe(false); expect(onChange).not.toHaveBeenCalled()
	await fireEvent.click(view.getByRole('button', {name: 'Toggle readonly'}))
	editor.commands.insertContentAt(1, 'Local ')
	await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
	view.unmount(); expect(editor.isDestroyed).toBe(true)
})

it('merges concurrent offline edits, reconnects and keeps undo isolated to each user',
	async() => {
		const alice = new Y.Doc(); const bob = new Y.Doc()
		const origin = {}
		const undoA = new Y.UndoManager(alice.getXmlFragment('content'),
			{trackedOrigins: new Set([ySyncPluginKey])})
		const undoB = new Y.UndoManager(bob.getXmlFragment('content'),
			{trackedOrigins: new Set([ySyncPluginKey])})
		const a = await mount({collaboration: {document: alice, undoManager: undoA}})
		a.editor.commands.insertContentAt(1, 'Seed')
		Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice), origin)
		const b = await mount({collaboration: {document: bob, undoManager: undoB}})
		undoA.clear(); undoB.clear(); undoA.stopCapturing(); undoB.stopCapturing()
		a.editor.commands.insertContentAt(1, 'Alice ')
		b.editor.commands.insertContentAt(1, 'Bob ')
		const updateA = Y.encodeStateAsUpdate(alice, Y.encodeStateVector(bob))
		const updateB = Y.encodeStateAsUpdate(bob, Y.encodeStateVector(alice))
		Y.applyUpdate(alice, updateB, origin); Y.applyUpdate(bob, updateA, origin)
		expect(a.editor.getText()).toBe(b.editor.getText())
		expect(a.editor.getText()).toContain('Alice '); expect(a.editor.getText()).toContain('Bob ')
		a.editor.commands.undo()
		Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice, Y.encodeStateVector(bob)), origin)
		expect(b.editor.getText()).not.toContain('Alice ')
		expect(b.editor.getText()).toContain('Bob ')
		b.editor.commands.undo()
		Y.applyUpdate(alice, Y.encodeStateAsUpdate(bob, Y.encodeStateVector(alice)), origin)
		expect(a.editor.getText()).toBe('Seed'); expect(b.editor.getText()).toBe('Seed')
		a.view.unmount(); b.view.unmount(); undoA.destroy(); undoB.destroy(); alice.destroy()
		bob.destroy()
	})

it('restores retained Yjs bytes into a new editor and never overwrites them with stale HTML',
	async() => {
		const document = new Y.Doc()
		const original = await mount({collaboration: {document}})
		original.editor.commands.insertContentAt(1, 'Unsent Ελληνικά ✨')
		const retained = Y.encodeStateAsUpdate(document)
		original.view.unmount()
		const restored = new Y.Doc(); Y.applyUpdate(restored, retained)
		const next = await mount({initial: '<p>Stale server HTML</p>',
			collaboration: {document: restored}})
		expect(next.editor.getText()).toBe('Unsent Ελληνικά ✨')
		await fireEvent.click(next.view.getByRole('button', {name: 'External HTML'}))
		expect(next.editor.getText()).toBe('Unsent Ελληνικά ✨')
		next.view.unmount(); document.destroy(); restored.destroy()
	})

it('releases view listeners while preserving a host-owned undo manager across remount',
	async() => {
		const document = new Y.Doc()
		const undoManager = new Y.UndoManager(document.getXmlFragment('content'),
			{trackedOrigins: new Set([ySyncPluginKey])})
		const destroy = vi.spyOn(undoManager, 'destroy')
		const first = await mount({collaboration: {document, undoManager}})
		first.editor.commands.insertContentAt(1, 'Retained undo')
		const changed = vi.fn(); const stop = observeRichTextToolbar(first.editor, changed)
		stop(); const calls = changed.mock.calls.length
		first.editor.commands.setTextSelection(1); expect(changed).toHaveBeenCalledTimes(calls)
		first.view.unmount(); expect(destroy).not.toHaveBeenCalled()
		const next = await mount({collaboration: {document, undoManager}})
		expect(next.editor.getText()).toBe('Retained undo')
		expect(next.editor.commands.undo()).toBe(true); expect(next.editor.getText()).toBe('')
		next.view.unmount(); undoManager.destroy(); document.destroy()
	})

it('standalone uses ordinary Tiptap undo/redo without a Yjs document', async() => {
	const {view, editor} = await mount()
	editor.commands.insertContentAt(1, 'Local ')
	expect(editor.commands.undo()).toBe(true); expect(editor.getText()).toBe('Hello')
	expect(editor.commands.redo()).toBe(true); expect(editor.getText()).toBe('Local Hello')
	view.unmount()
})
