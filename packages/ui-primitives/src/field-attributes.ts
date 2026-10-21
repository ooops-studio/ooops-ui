export type FieldAttributesOptions = {id: string;
	controlId?: string | undefined;
	description?: string | undefined;
	hint?: string | undefined;
	error?: string | undefined;
	required?: boolean | undefined;
	disabled?: boolean | undefined;
	pending?: boolean | undefined}

/** Spread onto the actual control; validation state is owned by the consumer. */
export const getFieldControlAttributes = (options: FieldAttributesOptions) => ({
	id: options.controlId ?? `${options.id}-control`,
	required: options.required ?? false,
	disabled: options.disabled ?? false,
	'aria-describedby': [options.description && `${options.id}-description`, options.error ? `${options.id}-error` : options.hint && `${options.id}-hint`].filter(Boolean).join(' ') || undefined,
	'aria-invalid': options.error ? 'true' as const : undefined,
	'aria-busy': options.pending ? 'true' as const : undefined
})
