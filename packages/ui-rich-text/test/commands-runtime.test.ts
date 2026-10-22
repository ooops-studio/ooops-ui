import {describe, expect, it, vi} from 'vitest'

import {
	focusRichTextSelection,
	getCurrentRichTextAlignment,
	getCurrentRichTextFormatValue,
	hasActiveRichTextTable,
	runRichTextTableCommandOnChain,
	setRichTextFormatOnChain,
	toggleRichTextMarkOnChain
} from '../src/lib/editor-commands.js'
import {
	getAssetAdapterCapabilities,
	getRichTextRuntimeCapabilities,
	insertRichTextAsset,
	insertRichTextReference,
	runSelectedTextAdapterAction
} from '../src/lib/runtime.js'
import type {
	RichTextAssetAdapter,
	RichTextHostAdapter,
	RichTextSelectedTextAdapter,
	RichTextSlashAdapter
} from '../src/lib/types.js'

const createChain = () => {
	const calls: Array<[string, unknown?]> = []
	const chain = {
		calls,
		focus: vi.fn(() => chain),
		setTextSelection: vi.fn((range: unknown) => {
			calls.push(['setTextSelection', range])
			return chain
		}),
		toggleBold: vi.fn(() => {
			calls.push(['toggleBold'])
			return chain
		}),
		setParagraph: vi.fn(() => {
			calls.push(['setParagraph'])
			return chain
		}),
		toggleHeading: vi.fn((attrs: unknown) => {
			calls.push(['toggleHeading', attrs])
			return chain
		}),
		insertTable: vi.fn((attrs: unknown) => {
			calls.push(['insertTable', attrs])
			return chain
		}),
		command: vi.fn((callback: (args: {commands: Record<string, unknown>}) => boolean) => {
			calls.push(['command', callback({commands: {insertEntityReference: vi.fn(() => true)}})])
			return chain
		}),
		run: vi.fn(() => {
			calls.push(['run'])
			return true
		})
	}
	return chain
}

const createEditor = () => {
	const chain = createChain()
	return {
		chain: vi.fn(() => chain),
		__chain: chain
	}
}

describe('rich text command helpers', () => {
	it('restores selection and runs common commands', () => {
		const editor = createEditor()
		const chain = focusRichTextSelection(editor as never, {from: 2, to: 5})

		toggleRichTextMarkOnChain(chain, 'bold')
		setRichTextFormatOnChain(chain, 'paragraph')
		setRichTextFormatOnChain(chain, 'heading2')
		runRichTextTableCommandOnChain(chain, 'insertTable')

		expect(editor.__chain.calls).toEqual(expect.arrayContaining([
			['setTextSelection', {from: 2, to: 5}],
			['toggleBold'],
			['setParagraph'],
			['toggleHeading', {level: 2}],
			['insertTable', {rows: 3, cols: 3, withHeaderRow: true}]
		]))
		expect(focusRichTextSelection(null, {from: 1, to: 1})).toBeNull()
	})

	it('derives active format, alignment, and table state', () => {
		const editor = {
			isActive: vi.fn((name: string, attrs?: Record<string, unknown>) => {
				if (name === 'heading' && attrs?.level === 3) return true
				if (name === 'paragraph' && attrs?.textAlign === 'center') return true
				if (name === 'table') return true
				return false
			})
		}

		expect(getCurrentRichTextFormatValue(editor)).toBe('heading3')
		expect(getCurrentRichTextAlignment(editor)).toBe('center')
		expect(hasActiveRichTextTable(editor)).toBe(true)
	})
})

describe('rich text runtime helpers', () => {
	it('gates runtime features by flags and adapter capabilities', () => {
		const hostAdapter: RichTextHostAdapter = {
			asset: {insertImage: vi.fn(), insertFileEmbed: vi.fn(), uploadFile: vi.fn()},
			slash: {
				commands: [{id: 'insert_note', label: 'Note', family: 'insert', entityType: 'note'}],
				searchReferences: vi.fn(),
				toReferenceAttrs: vi.fn()
			},
			selectedText: {
				actions: [{id: 'rewrite', label: 'Rewrite', kind: 'custom'}],
				runAction: vi.fn()
			},
			floatingMenu: {openEntity: vi.fn()}
		}

		expect(getRichTextRuntimeCapabilities(hostAdapter, {
			enableAssets: true,
			enableSlashCommands: true,
			enableSelectedTextActions: true,
			enableFloatingMenus: true
		})).toEqual({assets: true, slash: true, selectedText: true, floatingMenus: true})
		expect(getRichTextRuntimeCapabilities(null, {
			enableAssets: true,
			enableSlashCommands: true,
			enableSelectedTextActions: true,
			enableFloatingMenus: true
		})).toEqual({assets: false, slash: false, selectedText: false, floatingMenus: false})
	})

	it('inserts image/file assets and references through adapters', async() => {
		const editor = createEditor() as never
		const assetAdapter: RichTextAssetAdapter = {
			insertImage: vi.fn(),
			insertFileEmbed: vi.fn()
		}

		expect(getAssetAdapterCapabilities({...assetAdapter, uploadFile: vi.fn()})).toEqual({
			canUpload: true
		})
		expect(insertRichTextAsset(editor, assetAdapter, {
			id: 'image-1',
			name: 'Image',
			mimeType: 'image/png',
			url: 'https://example.com/image.png'
		}, {from: 4, to: 4})).toBe(true)
		expect(assetAdapter.insertImage).toHaveBeenCalledWith(editor, 'https://example.com/image.png', 'Image')

		const slashAdapter: RichTextSlashAdapter = {
			commands: [],
			searchReferences: vi.fn(),
			toReferenceAttrs: vi.fn(() => ({entityId: 'note-1'}))
		}
		expect(insertRichTextReference(editor, slashAdapter, {
			entityId: 'note-1',
			entityType: 'note',
			label: 'Note'
		})).toBe(true)

		const selectedTextAdapter: RichTextSelectedTextAdapter = {
			actions: [{id: 'rewrite', label: 'Rewrite', kind: 'custom'}],
			runAction: vi.fn(async() => ({ok: true})),
			insertResult: vi.fn()
		}
		await expect(runSelectedTextAdapterAction({
			editor,
			adapter: selectedTextAdapter,
			actionId: 'rewrite',
			selection: {text: 'Hello', html: '<p>Hello</p>'},
			range: {from: 1, to: 6},
			context: null
		})).resolves.toEqual({ok: true})
		expect(selectedTextAdapter.insertResult).toHaveBeenCalled()
	})
})
