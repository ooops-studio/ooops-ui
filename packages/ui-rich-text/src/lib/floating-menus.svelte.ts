import type {Editor} from '@tiptap/core'
import {NodeSelection} from '@tiptap/pm/state'

interface AddressMenuState {
	left: number;
	top: number;
	address: string;
	href: string;
	from: number;
	to: number;
}

export function useSharedRichTextFloatingMenus(config: {
	getEditorId: () => string;
	getEditor: () => Editor | null;
	getSurfaceEl: () => HTMLDivElement | null;
	onEntityModeChange?: (editor: Editor, displayMode: 'mention' | 'small_card' | 'big_card') =>
	void;
	onEntityOpen?: (href: string) => void;
	onAddressOpen?: (href: string) => void;
	onAddressConvert?: (editor: Editor, range: {from: number; to: number}, href: string) => void;
	floatingMenuSelector?: string;
	selectedTextBubbleSelector?: string;
	entityReferenceSelector?: string;
	addressCandidateSelector?: string;
	addressEventName?: string;
}) {
	const state = $state({
		entityMenuRect: null as {left: number; top: number} | null,
		activeEntityRefPos: null as number | null,
		activeEntityRefHref: null as string | null,
		addressMenu: null as AddressMenuState | null
	})

	const closeFloatingMenus = () => {
		state.entityMenuRect = null
		state.activeEntityRefPos = null
		state.activeEntityRefHref = null
		state.addressMenu = null
	}

	const selectEntityNodeAtPos = (pos: number) => {
		const editor = config.getEditor()
		if (!editor) return
		editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc,
			pos)))
	}

	const handleEntityModeChange = (displayMode: 'mention' | 'small_card' | 'big_card') => {
		const editor = config.getEditor()
		if (!editor || state.activeEntityRefPos == null) return
		selectEntityNodeAtPos(state.activeEntityRefPos)
		if (config.onEntityModeChange) {
			config.onEntityModeChange(editor, displayMode)
		} else {
			(editor.commands as unknown as {
				setEntityReferenceDisplayMode?: (value: typeof displayMode) => boolean
			})
				.setEntityReferenceDisplayMode?.(displayMode)
		}
		closeFloatingMenus()
	}

	const handleEntityOpen = () => {
		if (state.activeEntityRefHref) {
			if (config.onEntityOpen) config.onEntityOpen(state.activeEntityRefHref)
			else window.open(state.activeEntityRefHref, '_blank', 'noopener,noreferrer')
		}
		closeFloatingMenus()
	}

	const handleAddressOpen = () => {
		if (!state.addressMenu) return
		if (config.onAddressOpen) config.onAddressOpen(state.addressMenu.href)
		else window.open(state.addressMenu.href, '_blank', 'noopener,noreferrer')
		closeFloatingMenus()
	}

	const handleAddressConvert = () => {
		const editor = config.getEditor()
		if (!editor || !state.addressMenu) return
		if (config.onAddressConvert) {
			config.onAddressConvert(editor, {from: state.addressMenu.from, to: state.addressMenu.to},
				state.addressMenu.href)
		} else {
			editor
				.chain()
				.focus()
				.setTextSelection({from: state.addressMenu.from, to: state.addressMenu.to})
				.command(({commands}) =>
					Boolean(
						(commands as unknown as {convertSelectionToMapLink?: (href: string) => boolean})
							.convertSelectionToMapLink?.(state.addressMenu?.href || '')
					)
				)
				.run()
		}
		closeFloatingMenus()
	}

	const mount = () => {
		const floatingMenuSelector = config.floatingMenuSelector ?? '.shared-rich-text-editor__floating-menu'
		const selectedTextBubbleSelector = config.selectedTextBubbleSelector ?? '.shared-selected-text-action-bubble'
		const entityReferenceSelector = config.entityReferenceSelector ?? '[data-richtext-entity-ref]'
		const addressCandidateSelector = config.addressCandidateSelector ?? '[data-richtext-address-candidate]'
		const addressEventName = config.addressEventName ?? 'suite-richtext-address-click'

		const handleAddressEvent = (event: Event) => {
			const detail = (event as CustomEvent<{editorId: string; address: string; href: string;
				from: number; to: number}>).detail
			const editor = config.getEditor()
			if (detail.editorId !== config.getEditorId() || !editor) return
			const coords = editor.view.coordsAtPos(Math.max(1, detail.to))
			state.addressMenu = {
				left: coords.left,
				top: coords.bottom + 8,
				address: detail.address,
				href: detail.href,
				from: detail.from,
				to: detail.to
			}
			state.entityMenuRect = null
		}

		const handleDocumentClick = (event: MouseEvent) => {
			const target = event.target
			const editor = config.getEditor()
			if (!(target instanceof HTMLElement)) return
			if (target.closest(floatingMenuSelector)) return
			if (target.closest(selectedTextBubbleSelector)) return
			if (target.closest(addressCandidateSelector)) return

			const refEl = target.closest<HTMLElement>(entityReferenceSelector)
			if (refEl && config.getSurfaceEl()?.contains(refEl) && editor) {
				const pos = editor.view.posAtDOM(refEl, 0)
				state.activeEntityRefPos = pos
				state.activeEntityRefHref = refEl.dataset.href || refEl.getAttribute('href') || null
				selectEntityNodeAtPos(pos)
				const rect = refEl.getBoundingClientRect()
				state.entityMenuRect = {left: rect.left, top: rect.bottom + 8}
				state.addressMenu = null
				event.preventDefault()
				return
			}

			closeFloatingMenus()
		}

		window.addEventListener(addressEventName, handleAddressEvent as EventListener)
		document.addEventListener('click', handleDocumentClick)

		return () => {
			window.removeEventListener(addressEventName, handleAddressEvent as EventListener)
			document.removeEventListener('click', handleDocumentClick)
		}
	}

	return {
		state,
		closeFloatingMenus,
		handleEntityModeChange,
		handleEntityOpen,
		handleAddressOpen,
		handleAddressConvert,
		mount
	}
}
