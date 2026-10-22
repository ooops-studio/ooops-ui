import type {Editor} from '@tiptap/core'

export type RichTextMarkCommand = 'bold' | 'italic' | 'underline' | 'strike'
export type RichTextNodeCommand =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bulletList'
  | 'orderedList'
export type RichTextFormatValue = Exclude<RichTextNodeCommand, 'bulletList' | 'orderedList'>
export type RichTextAlignment = 'left' | 'center' | 'right'
export type RichTextTableCommand =
  | 'insertTable'
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteColumn'
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteRow'
  | 'deleteTable'

export interface RichTextSelectionRange {
	from: number;
	to: number;
}

type RichTextCommandChain = ReturnType<Editor['chain']> & {
	toggleBold: () => RichTextCommandChain;
	toggleItalic: () => RichTextCommandChain;
	toggleUnderline: () => RichTextCommandChain;
	toggleStrike: () => RichTextCommandChain;
	setParagraph: () => RichTextCommandChain;
	toggleHeading: (attrs: {level: 1 | 2 | 3 | 4}) => RichTextCommandChain;
	toggleBulletList: () => RichTextCommandChain;
	toggleOrderedList: () => RichTextCommandChain;
	setTextAlign: (alignment: RichTextAlignment) => RichTextCommandChain;
	insertTable: (attrs: {rows: number; cols: number; withHeaderRow: boolean}) =>
	RichTextCommandChain;
	addColumnBefore: () => RichTextCommandChain;
	addColumnAfter: () => RichTextCommandChain;
	deleteColumn: () => RichTextCommandChain;
	addRowBefore: () => RichTextCommandChain;
	addRowAfter: () => RichTextCommandChain;
	deleteRow: () => RichTextCommandChain;
	deleteTable: () => RichTextCommandChain;
}

export const RICH_TEXT_FORMAT_OPTIONS = [
	{value: 'paragraph', label: 'Paragraph'},
	{value: 'heading1', label: 'Heading 1'},
	{value: 'heading2', label: 'Heading 2'},
	{value: 'heading3', label: 'Heading 3'},
	{value: 'heading4', label: 'Heading 4'}
] as const satisfies ReadonlyArray<{value: RichTextFormatValue; label: string}>

export const asRichTextCommandChain = (chain: ReturnType<Editor['chain']>) =>
	chain as RichTextCommandChain

export const focusRichTextSelection = (
	editor: Editor | null,
	selectionRange: RichTextSelectionRange | null
): RichTextCommandChain | null => {
	if (!editor) return null
	const chain = asRichTextCommandChain(editor.chain().focus())
	if (selectionRange) chain.setTextSelection(selectionRange)
	return chain
}

export const toggleRichTextMarkOnChain = (chain: RichTextCommandChain | null,
	mark: RichTextMarkCommand) => {
	if (!chain) return
	if (mark === 'bold') chain.toggleBold().run()
	if (mark === 'italic') chain.toggleItalic().run()
	if (mark === 'underline') chain.toggleUnderline().run()
	if (mark === 'strike') chain.toggleStrike().run()
}

export const toggleRichTextListOnChain = (chain: RichTextCommandChain | null,
	kind: 'bulletList' | 'orderedList') => {
	if (!chain) return
	if (kind === 'bulletList') chain.toggleBulletList().run()
	if (kind === 'orderedList') chain.toggleOrderedList().run()
}

export const setRichTextFormatOnChain = (
	chain: RichTextCommandChain | null,
	value: RichTextFormatValue
) => {
	if (!chain) return
	if (value === 'paragraph') chain.setParagraph().run()
	if (value === 'heading1') chain.toggleHeading({level: 1}).run()
	if (value === 'heading2') chain.toggleHeading({level: 2}).run()
	if (value === 'heading3') chain.toggleHeading({level: 3}).run()
	if (value === 'heading4') chain.toggleHeading({level: 4}).run()
}

export const runRichTextNodeCommandOnChain = (chain: RichTextCommandChain | null,
	value: RichTextNodeCommand) => {
	if (value === 'bulletList' || value === 'orderedList') {
		toggleRichTextListOnChain(chain, value)
		return
	}
	setRichTextFormatOnChain(chain, value)
}

export const setRichTextAlignmentOnChain = (chain: RichTextCommandChain | null,
	alignment: RichTextAlignment) => {
	if (!chain) return
	chain.setTextAlign(alignment).run()
}

export const runRichTextTableCommandOnChain = (chain: RichTextCommandChain | null,
	command: RichTextTableCommand) => {
	if (!chain) return
	if (command === 'insertTable') chain.insertTable({rows: 3, cols: 3,
		withHeaderRow: true}).run()
	if (command === 'addColumnBefore') chain.addColumnBefore().run()
	if (command === 'addColumnAfter') chain.addColumnAfter().run()
	if (command === 'deleteColumn') chain.deleteColumn().run()
	if (command === 'addRowBefore') chain.addRowBefore().run()
	if (command === 'addRowAfter') chain.addRowAfter().run()
	if (command === 'deleteRow') chain.deleteRow().run()
	if (command === 'deleteTable') chain.deleteTable().run()
}

export const getCurrentRichTextFormatValue = (editor: Pick<Editor,
	'isActive'> | null): RichTextFormatValue => {
	if (editor?.isActive('heading', {level: 1})) return 'heading1'
	if (editor?.isActive('heading', {level: 2})) return 'heading2'
	if (editor?.isActive('heading', {level: 3})) return 'heading3'
	if (editor?.isActive('heading', {level: 4})) return 'heading4'
	return 'paragraph'
}

export const getCurrentRichTextFormatLabel = (editor: Pick<Editor, 'isActive'> | null) =>
	RICH_TEXT_FORMAT_OPTIONS.find((option) =>
		option.value === getCurrentRichTextFormatValue(editor))?.label || 'Paragraph'

export const getCurrentRichTextAlignment = (editor: Pick<Editor,
	'isActive'> | null): RichTextAlignment => {
	if (editor?.isActive('paragraph', {textAlign: 'center'}) || editor?.isActive('heading',
		{textAlign: 'center'})) {
		return 'center'
	}
	if (editor?.isActive('paragraph', {textAlign: 'right'}) || editor?.isActive('heading',
		{textAlign: 'right'})) {
		return 'right'
	}
	return 'left'
}

export const getCurrentRichTextAlignmentLabel = (editor: Pick<Editor, 'isActive'> | null) => {
	const value = getCurrentRichTextAlignment(editor)
	if (value === 'center') return 'Center'
	if (value === 'right') return 'Right'
	return 'Left'
}

export const isRichTextMarkOrListActive = (
	editor: Pick<Editor, 'isActive'> | null,
	mark: RichTextMarkCommand | 'bulletList' | 'orderedList'
) => editor?.isActive(mark) ?? false

export const hasActiveRichTextTable = (editor: Pick<Editor, 'isActive'> | null) =>
	Boolean(editor?.isActive('table'))
