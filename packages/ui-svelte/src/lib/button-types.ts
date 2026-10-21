import type {Snippet} from 'svelte'
import type {HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes} from 'svelte/elements'

export type ButtonProps = Omit<HTMLAttributes<HTMLElement>, 'children'> &
	Pick<HTMLButtonAttributes, 'form' | 'formaction' | 'formenctype' | 'formmethod' | 'formnovalidate' |
	'formtarget' | 'name' | 'value' | 'popovertarget' | 'popovertargetaction'> &
	Pick<HTMLAnchorAttributes, 'href' | 'target' | 'rel' | 'download' | 'hreflang' | 'referrerpolicy'> & {
		parts?: import('@ooopsstudio/ui-primitives').UiParts | undefined
		type?: 'button' | 'submit' | 'reset'
		disabled?: boolean
		loading?: boolean
		ariaLabel?: string
		elementRef?: HTMLButtonElement | HTMLAnchorElement | null
		children?: Snippet
		loadingIndicator?: Snippet
	}
export type IconButtonProps = Omit<ButtonProps, 'ariaLabel' | 'aria-label'> & {label: string}
