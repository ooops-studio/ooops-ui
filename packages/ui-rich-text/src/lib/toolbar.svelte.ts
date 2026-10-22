import type {Editor} from '@tiptap/core'

import {
	focusRichTextSelection,
	getCurrentRichTextAlignment,
	getCurrentRichTextFormatValue,
	hasActiveRichTextTable,
	runRichTextTableCommandOnChain,
	setRichTextAlignmentOnChain,
	setRichTextFormatOnChain,
	toggleRichTextListOnChain,
	toggleRichTextMarkOnChain,
	type RichTextAlignment,
	type RichTextFormatValue,
	type RichTextMarkCommand,
	type RichTextTableCommand
} from './editor-commands.js'

export interface SharedRichTextToolbar {
	focusSavedSelection: () => ReturnType<typeof focusRichTextSelection>;
	readonly currentFormatValue: RichTextFormatValue;
	readonly currentTextAlign: RichTextAlignment;
	readonly hasActiveTable: boolean;
	isMarkActive: (mark: RichTextMarkCommand | 'bulletList' | 'orderedList') => boolean;
	toggleMark: (mark: RichTextMarkCommand) => void;
	toggleList: (kind: 'bulletList' | 'orderedList') => void;
	setFormat: (value: RichTextFormatValue) => void;
	setAlignment: (alignment: RichTextAlignment) => void;
	runTableCommand: (command: RichTextTableCommand) => void;
}

export function useSharedRichTextToolbar(config: {
	getEditor: () => Editor | null;
	getSelectionRange: () => {from: number; to: number} | null;
	closeMenu?: () => void;
}): SharedRichTextToolbar {
	const focusSavedSelection = () =>
		focusRichTextSelection(config.getEditor(), config.getSelectionRange())

	const currentFormatValue = $derived.by<RichTextFormatValue>(() => {
		void config.getSelectionRange()
		return getCurrentRichTextFormatValue(config.getEditor())
	})

	const currentTextAlign = $derived.by<RichTextAlignment>(() => {
		void config.getSelectionRange()
		return getCurrentRichTextAlignment(config.getEditor())
	})

	const hasActiveTable = $derived.by(() => {
		void config.getSelectionRange()
		return hasActiveRichTextTable(config.getEditor())
	})

	const selectionContainsMark = (mark: RichTextMarkCommand) => {
		const editor = config.getEditor()
		if (!editor) return false
		const type = editor.schema.marks[mark]
		if (!type) return false
		const {from, to, empty} = editor.state.selection
		if (empty) {
			const storedMarks =
				editor.state.storedMarks || editor.state.selection.$from.marks()
			return storedMarks.some((candidate) => candidate.type === type)
		}
		let found = false
		editor.state.doc.nodesBetween(from, to, (node) => {
			if (!node.isText) return
			if (node.marks.some((candidate) => candidate.type === type)) {
				found = true
				return false
			}
			return
		})
		return found
	}

	const isMarkActive = (
		mark: RichTextMarkCommand | 'bulletList' | 'orderedList'
	) => {
		void config.getSelectionRange()
		const editor = config.getEditor()
		if (!editor) return false
		if (mark === 'bulletList' || mark === 'orderedList')
			return editor.isActive(mark)
		if (editor.isActive(mark)) return true
		return selectionContainsMark(mark)
	}

	const toggleMark = (mark: RichTextMarkCommand) => {
		toggleRichTextMarkOnChain(focusSavedSelection(), mark)
	}

	const toggleList = (kind: 'bulletList' | 'orderedList') => {
		toggleRichTextListOnChain(focusSavedSelection(), kind)
	}

	const setFormat = (value: RichTextFormatValue) => {
		setRichTextFormatOnChain(focusSavedSelection(), value)
		config.closeMenu?.()
	}

	const setAlignment = (alignment: RichTextAlignment) => {
		setRichTextAlignmentOnChain(focusSavedSelection(), alignment)
		config.closeMenu?.()
	}

	const runTableCommand = (command: RichTextTableCommand) => {
		runRichTextTableCommandOnChain(focusSavedSelection(), command)
		if (command === 'insertTable' || command === 'deleteTable')
			config.closeMenu?.()
	}

	return {
		focusSavedSelection,
		get currentFormatValue() {
			return currentFormatValue
		},
		get currentTextAlign() {
			return currentTextAlign
		},
		get hasActiveTable() {
			return hasActiveTable
		},
		isMarkActive,
		toggleMark,
		toggleList,
		setFormat,
		setAlignment,
		runTableCommand
	}
}
