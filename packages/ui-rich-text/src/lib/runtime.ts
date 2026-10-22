import type {Editor} from '@tiptap/core'
import {DOMSerializer} from '@tiptap/pm/model'

import {focusRichTextSelection} from './editor-commands.js'
import type {
	RichTextAssetAdapter,
	RichTextHostAdapter,
	RichTextInsertFilePayload,
	RichTextSelectedTextAdapter,
	RichTextSlashAdapter
} from './types.js'

export type RichTextSelectionPayload = {
	text: string;
	html: string;
	contentJson?: Record<string, unknown> | null;
}

export const getRichTextRuntimeCapabilities = (
	hostAdapter: RichTextHostAdapter | null | undefined,
	flags: {
		enableSlashCommands?: boolean;
		enableSelectedTextActions?: boolean;
		enableFloatingMenus?: boolean;
		enableAssets?: boolean;
	} = {}
) => {
	const asset = hostAdapter?.asset ?? null
	const slash = hostAdapter?.slash ?? null
	const selectedText = hostAdapter?.selectedText ?? null
	const floatingMenu = hostAdapter?.floatingMenu ?? null
	return {
		assets: Boolean(flags.enableAssets && asset && !asset.disabledReason && asset.uploadFile),
		slash: Boolean(flags.enableSlashCommands && slash && slash.commands.length > 0),
		selectedText: Boolean(flags.enableSelectedTextActions && selectedText &&
			selectedText.actions.length > 0),
		floatingMenus: Boolean(flags.enableFloatingMenus && floatingMenu)
	}
}

export const getAssetAdapterCapabilities = (
	assetAdapter: RichTextAssetAdapter | null | undefined
) => ({
	canUpload: Boolean(assetAdapter?.uploadFile && !assetAdapter.disabledReason)
})

export const insertRichTextAsset = (
	editor: Editor | null,
	assetAdapter: RichTextAssetAdapter | null | undefined,
	file: RichTextInsertFilePayload,
	selectionRange: {from: number; to: number} | null,
	altText = file.name
) => {
	if (!editor || !assetAdapter) return false
	focusRichTextSelection(editor, selectionRange)
	if (file.url && file.mimeType?.startsWith('image/')) {
		assetAdapter.insertImage(editor, file.url, altText)
		return true
	}
	assetAdapter.insertFileEmbed(editor, file)
	return true
}

export const buildRichTextSelectionPayload = (
	editor: Editor | null,
	selectionRange: {from: number; to: number} | null
): RichTextSelectionPayload | null => {
	if (!editor || !selectionRange || selectionRange.from === selectionRange.to) return null
	const text = editor.state.doc.textBetween(selectionRange.from, selectionRange.to, '\n',
		'\n').trim()
	if (!text) return null
	const slice = editor.state.doc.slice(selectionRange.from, selectionRange.to)
	const wrapper = document.createElement('div')
	wrapper.appendChild(
		DOMSerializer.fromSchema(editor.state.schema).serializeFragment(slice.content)
	)
	return {
		text,
		html: wrapper.innerHTML,
		contentJson: {
			type: 'doc',
			content: slice.content.toJSON()
		}
	}
}

export const insertRichTextReference = (
	editor: Editor | null,
	slashAdapter: RichTextSlashAdapter | null | undefined,
	reference: Parameters<NonNullable<RichTextSlashAdapter['insertReference']>>[1],
	range: {from: number; to: number} | null = null
) => {
	if (!editor || !slashAdapter) return false
	if (slashAdapter.insertReference) {
		slashAdapter.insertReference(editor, reference, range)
		return true
	}
	const attrs = slashAdapter.toReferenceAttrs(reference)
	const chain = editor.chain().focus()
	if (range) chain.setTextSelection(range)
	return chain
		.command(({commands}) =>
			Boolean(
				(commands as unknown as {insertEntityReference?: (attrs: Record<string, unknown>) =>
				boolean})
					.insertEntityReference?.(attrs)
			)
		)
		.run()
}

export const runSelectedTextAdapterAction = async(args: {
	editor: Editor | null;
	adapter: RichTextSelectedTextAdapter;
	actionId: string;
	selection: RichTextSelectionPayload;
	range: {from: number; to: number};
	context: unknown | null;
	input?: unknown;
}) => {
	const result = await args.adapter.runAction({
		actionId: args.actionId,
		selection: args.selection,
		input: args.input,
		context: args.context
	})
	if (args.editor && args.adapter.insertResult) {
		args.adapter.insertResult(args.editor, result, args.range)
	}
	return result
}
