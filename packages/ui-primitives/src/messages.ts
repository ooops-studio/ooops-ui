export type UiMessages = {
	clear: string;
	clearSelection: string;
	clearSelections: string;
	showPassword: string;
	hidePassword: string;
	searchOptions: string;
	selectOption: string;
	selectAll: string;
	noOptions: string;
	loading: string;
	removeItem: string;
	decrease: string;
	increase: string;
	open: string;
	menu: string;
	popover: string;
	dialog: string;
	closeDialog: string;
	confirm: string;
	cancel: string;
	value: string;
	tabs: string;
}

export const DEFAULT_UI_MESSAGES: Readonly<UiMessages> = Object.freeze({
	clear: 'Clear',
	clearSelection: 'Clear selection',
	clearSelections: 'Clear selections',
	showPassword: 'Show password',
	hidePassword: 'Hide password',
	searchOptions: 'Search options',
	selectOption: 'Select an option',
	selectAll: 'Select all',
	noOptions: 'No options',
	loading: 'Loading…',
	removeItem: 'Remove {label}',
	decrease: 'Decrease',
	increase: 'Increase',
	open: 'Open',
	menu: 'Menu',
	popover: 'Popover',
	dialog: 'Dialog',
	closeDialog: 'Close dialog',
	confirm: 'Confirm',
	cancel: 'Cancel',
	value: 'Value',
	tabs: 'Tabs'
})

export const resolveUiMessages = (
	messages?: Partial<UiMessages>
): Readonly<UiMessages> =>
	Object.freeze({...DEFAULT_UI_MESSAGES, ...messages})

export const formatUiMessage = (
	message: string,
	values: Readonly<Record<string, string | number>>
) =>
	message.replace(/\{([a-zA-Z][\w-]*)\}/g, (match, key: string) =>
		String(values[key] ?? match)
	)
