export type AccordionItem = {id: string; title: string; content?: string; disabled?: boolean}

export type DropdownMenuItem = {
	id: string
	label?: string
	href?: string
	value?: string
	type?: 'item' | 'checkbox' | 'radio' | 'separator' | 'label'
	checked?: boolean
	disabled?: boolean
	group?: string
	keepOpen?: boolean
	children?: DropdownMenuItem[]
}

export type TabItem = {
	id: string
	label: string
	content?: string
	href?: string
	disabled?: boolean
}
