import type {Editor} from '@tiptap/core'

export interface RichTextToolbarState {
	bold: boolean; italic: boolean; underline: boolean; strike: boolean;
	link: boolean; table: boolean; bulletList: boolean; orderedList: boolean;
	formatLabel: string; listLabel: string; alignLabel: string;
	canUndo: boolean; canRedo: boolean;
}

export function readRichTextToolbarState(editor: Editor | null): RichTextToolbarState {
	const active = (name: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
		try { return editor ? (typeof name === 'string' ? editor.isActive(name,
			attrs) : editor.isActive(name)) : false }
		catch { return false }
	}
	const can = (command: 'undo' | 'redo') => {
		try { return editor?.can().chain()[command]().run() ?? false }
		catch { return false }
	}
	const bulletList = active('bulletList')
	const orderedList = active('orderedList')
	const level = [1, 2, 3, 4].find((value) => active('heading', {level: value}))
	return {
		bold: active('bold'), italic: active('italic'), underline: active('underline'),
		strike: active('strike'),
		link: active('link'), table: active('table'), bulletList, orderedList,
		formatLabel: level ? `Heading ${level}` : 'Paragraph',
		listLabel: bulletList ? 'Bullets' : orderedList ? 'Numbers' : 'List',
		alignLabel: active({textAlign: 'center'}) ? 'Center' : active({textAlign: 'right'}) ? 'Right' : 'Left',
		canUndo: can('undo'), canRedo: can('redo')
	}
}

/** Observe editor state without owning, replacing or destroying the host's editor. */
export function observeRichTextToolbar(editor: Editor,
	onState: (state: RichTextToolbarState) => void) {
	const refresh = () => onState(readRichTextToolbarState(editor))
	const events = ['transaction', 'selectionUpdate', 'focus', 'blur'] as const
	for (const event of events) editor.on(event, refresh)
	refresh()
	return () => { for (const event of events) editor.off(event, refresh) }
}
