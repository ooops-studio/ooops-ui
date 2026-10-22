import type {Editor} from '@tiptap/core'

import type {RichTextAlignment} from './editor-commands.js'

export interface RichTextInsertFilePayload {
	id: string;
	name: string;
	mimeType?: string | null;
	url?: string | null;
}

export interface RichTextAssetAdapter {
	insertImage: (editor: Editor, src: string, altText: string) => void;
	insertFileEmbed: (editor: Editor, file: RichTextInsertFilePayload) => void;
	uploadFile?: (file: File) => Promise<RichTextInsertFilePayload>;
	disabledReason?: string | null;
}

export interface RichTextSlashCommand {
	id: string;
	label: string;
	family: 'create' | 'insert';
	entityType: string;
}

export interface RichTextReferenceResult {
	entityType: string;
	entityId: string;
	label: string;
	subtitle?: string | null;
	meta?: string | null;
	avatarUrl?: string | null;
}

export interface RichTextSlashAdapter {
	commands: RichTextSlashCommand[];
	searchReferences: (args: {
		query: string;
		entityType: string;
		context: unknown | null;
	}) => Promise<RichTextReferenceResult[]>;
	createEntity?: (args: {
		entityType: string;
		values: Record<string, unknown>;
		context: unknown | null;
	}) => Promise<RichTextReferenceResult>;
	toReferenceAttrs: (reference: RichTextReferenceResult) => Record<string, unknown>;
	insertReference?: (editor: Editor, reference: RichTextReferenceResult,
		range?: {from: number; to: number} | null) => void;
}

export interface RichTextSelectedTextAction {
	id: string;
	label: string;
	kind: 'create' | 'link' | 'custom';
}

export interface RichTextSelectedTextAdapter {
	actions: RichTextSelectedTextAction[];
	runAction: (args: {
		actionId: string;
		selection: {text: string; html: string; contentJson?: Record<string, unknown> | null};
		input?: unknown;
		context: unknown | null;
	}) => Promise<unknown>;
	searchLinkTargets?: (query: string, context: unknown | null) =>
	Promise<RichTextReferenceResult[]>;
	insertResult?: (editor: Editor, result: unknown, range: {from: number; to: number}) => void;
	buildDefaultInput?: (actionId: string, selection: {text: string; html: string}) =>
	Record<string, unknown>;
}

export interface RichTextFloatingMenuAdapter {
	setEntityDisplayMode?: (editor: Editor,
		displayMode: 'mention' | 'small_card' | 'big_card') => void;
	openEntity?: (href: string) => void;
	openAddress?: (href: string) => void;
	convertAddress?: (editor: Editor, range: {from: number; to: number}, href: string) => void;
}

export interface RichTextToolbarAdapter {
	setFormat?: (editor: Editor, value: string) => void;
	setAlignment?: (editor: Editor, value: RichTextAlignment) => void;
}

export interface RichTextAiAction {
	id: string;
	label: string;
	description?: string | null;
	selectionRequired?: boolean;
}

export interface RichTextHostAdapter {
	asset?: RichTextAssetAdapter | null;
	slash?: RichTextSlashAdapter | null;
	selectedText?: RichTextSelectedTextAdapter | null;
	floatingMenu?: RichTextFloatingMenuAdapter | null;
	toolbar?: RichTextToolbarAdapter | null;
	aiActions?: RichTextAiAction[];
	slashCommandsEnabled?: boolean;
	selectedTextActionsEnabled?: boolean;
}
