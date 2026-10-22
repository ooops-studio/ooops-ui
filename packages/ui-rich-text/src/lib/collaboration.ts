import Collaboration from '@tiptap/extension-collaboration'
import type {Doc, UndoManager} from 'yjs'

import {leaseRichTextUndo} from './undo.js'

/** The host owns the document, transport, authorization, persistence and undo lifetime. */
export interface RichTextCollaboration {
	document: Doc;
	field?: string;
	undoManager?: UndoManager;
}

export function createRichTextCollaboration(options: RichTextCollaboration) {
	return Collaboration.configure({
		document: options.document,
		field: options.field ?? 'content',
		...(options.undoManager ? {
			yUndoOptions: {undoManager: leaseRichTextUndo(options.undoManager)}
		} : {})
	})
}
