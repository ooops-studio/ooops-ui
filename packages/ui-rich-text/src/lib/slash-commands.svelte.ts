import type {Editor} from '@tiptap/core'

export interface SharedSlashCommandEventDetail<TCommand> {
	editorId: string;
	range: {from: number; to: number};
	command: TCommand;
}

export function useSharedSlashCommandOverlays<TCommand extends {family: string;
	entityType: string}>(config: {
	getEditorId: () => string;
	getEditor: () => Editor | null;
	getContext: () => unknown | null;
	eventName?: string;
	isCreateCommand?: (command: TCommand) => boolean;
	onCreateCommand?: (detail: SharedSlashCommandEventDetail<TCommand>) => void;
	onInsertCommand?: (detail: SharedSlashCommandEventDetail<TCommand>) => void;
}) {
	const state = $state({
		insertPosition: null as number | null
	})

	const focusInsertionPoint = () => {
		const editor = config.getEditor()
		if (!editor) return null
		const chain = editor.chain().focus()
		if (state.insertPosition != null) {
			chain.setTextSelection({from: state.insertPosition, to: state.insertPosition})
		}
		return chain
	}

	const mount = () => {
		const eventName = config.eventName ?? 'suite-richtext-run-slash-command'
		const isCreateCommand = config.isCreateCommand ?? ((command: TCommand) =>
			command.family === 'create')

		const handleSlashCommandEvent = (event: Event) => {
			const detail = (event as CustomEvent<SharedSlashCommandEventDetail<TCommand>>).detail
			if (detail.editorId !== config.getEditorId() || !config.getContext()) return
			state.insertPosition = detail.range.from
			if (isCreateCommand(detail.command)) {
				config.onCreateCommand?.(detail)
				return
			}
			config.onInsertCommand?.(detail)
		}

		window.addEventListener(eventName, handleSlashCommandEvent as EventListener)
		return () => window.removeEventListener(eventName, handleSlashCommandEvent as EventListener)
	}

	return {
		state,
		focusInsertionPoint,
		mount
	}
}
