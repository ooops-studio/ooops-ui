import {createControllerStore, type Subscriber} from './store'

export type ValidationTrigger = 'input' | 'blur' | 'submit'

export type ValidationIssue = {
	message: string
	code?: string
	path?: ReadonlyArray<PropertyKey>
}

export type StandardSchemaResult<Output> =
	| {value: Output; issues?: undefined}
	| {
		value?: undefined
		issues: ReadonlyArray<{message: string; path?: ReadonlyArray<PropertyKey>}>
	}

export type StandardSchemaLike<Input = unknown, Output = Input> = {
	readonly '~standard': {
		readonly version: 1
		readonly vendor: string
		readonly validate: (
			value: Input
		) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>
	}
}

export type ValidationRule<
	Value,
	Values extends Record<string, unknown> = Record<string, unknown>
> = (
	value: Readonly<Value>,
	context: {values: Readonly<Values>; signal: AbortSignal}
) =>
	| ValidationIssue
	| ReadonlyArray<ValidationIssue>
	| null
	| undefined
	| Promise<ValidationIssue | ReadonlyArray<ValidationIssue> | null | undefined>

export type FieldState<Value> = {
	value: Value
	initialValue: Value
	touched: boolean
	dirty: boolean
	pending: boolean
	valid: boolean
	disabled: boolean
	issues: ReadonlyArray<ValidationIssue>
	externalIssues: ReadonlyArray<ValidationIssue>
}

export type FieldController<Value> = {
	getState: () => FieldState<Value>
	subscribe: (subscriber: Subscriber<FieldState<Value>>) => () => void
	setValue: (value: Value, trigger?: ValidationTrigger) => Promise<boolean>
	setTouched: (touched?: boolean) => void
	setDisabled: (disabled: boolean) => void
	setExternalIssues: (issues: ReadonlyArray<ValidationIssue>) => void
	validate: (trigger?: ValidationTrigger) => Promise<boolean>
	reset: (value?: Value) => void
	focus: () => void
	destroy: () => void
}

export type FieldControllerOptions<
	Value,
	Values extends Record<string, unknown> = Record<string, unknown>
> = {
	value: Value
	disabled?: boolean
	validateOn?: ReadonlyArray<ValidationTrigger>
	rules?: ReadonlyArray<ValidationRule<Value, Values>>
	schema?: StandardSchemaLike<Value>
	getValues?: () => Values
	getElement?: () => HTMLElement | null | undefined
	onChange?: (value: Value) => void
}

const normalizeIssues = (
	value: ValidationIssue | ReadonlyArray<ValidationIssue> | null | undefined
) => (value ? (Array.isArray(value) ? [...value] : [value as ValidationIssue]) : [])

const freezeIssues = (issues: ReadonlyArray<ValidationIssue>) =>
	Object.freeze(issues.map((issue) => Object.freeze({...issue})))

const nativeConstraintIssue = (
	element: HTMLElement | null | undefined
): ValidationIssue | null => {
	if (
		!(
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement ||
			element instanceof HTMLSelectElement
		)
	)
		return null
	if (!element.willValidate || element.validity.valid) return null
	const checks: ReadonlyArray<[keyof ValidityState, string, string]> = [
		['valueMissing', 'required', 'This field is required.'],
		['typeMismatch', 'type', 'Enter a valid value.'],
		['patternMismatch', 'pattern', 'Use the requested format.'],
		['tooShort', 'min_length', 'The value is too short.'],
		['tooLong', 'max_length', 'The value is too long.'],
		['rangeUnderflow', 'min', 'The value is below the minimum.'],
		['rangeOverflow', 'max', 'The value is above the maximum.'],
		['stepMismatch', 'step', 'Enter a valid step value.'],
		['badInput', 'input', 'Enter a valid value.'],
		['customError', 'custom', 'The value is invalid.']
	]
	const match = checks.find(([key]) => element.validity[key])
	return match ? {code: `native_${match[1]}`, message: match[2]} : {code: 'native_invalid', message: 'The value is invalid.'}
}

const equalValues = (left: unknown, right: unknown): boolean => {
	if (Object.is(left, right)) return true
	if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
	if (Array.isArray(left) && Array.isArray(right))
		return (
			left.length === right.length && left.every((entry, index) => equalValues(entry, right[index]))
		)
	if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
	const leftKeys = Object.keys(left)
	const rightKeys = Object.keys(right)
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key) =>
				Object.hasOwn(right, key) &&
				equalValues(
					(left as Record<string, unknown>)[key],
					(right as Record<string, unknown>)[key]
				)
		)
	)
}

export const createFieldController = <
	Value,
	Values extends Record<string, unknown> = Record<string, unknown>
>(
	options: FieldControllerOptions<Value, Values>
): FieldController<Value> => {
	let initialValue = structuredClone(options.value)
	let validationRun = 0
	let validationAbort: AbortController | null = null
	let activeValidation: {run: number; promise: Promise<boolean>} | null = null
	const validateOn = new Set(options.validateOn ?? ['blur', 'submit'])
	const store = createControllerStore<FieldState<Value>>({
		value: structuredClone(options.value),
		initialValue: structuredClone(options.value),
		touched: false,
		dirty: false,
		pending: false,
		valid: true,
		disabled: options.disabled ?? false,
		issues: [],
		externalIssues: []
	})

	const executeValidation = async(
		trigger: ValidationTrigger,
		state: FieldState<Value>,
		abort: AbortController,
		run: number
	): Promise<boolean> => {
		const issues: ValidationIssue[] = []
		try {
			const nativeIssue = nativeConstraintIssue(options.getElement?.())
			if (nativeIssue) issues.push(nativeIssue)
			if (options.schema) {
				const result = await options.schema['~standard'].validate(state.value)
				if (result.issues) issues.push(...result.issues.map((issue) => ({...issue})))
			}
			const values = options.getValues?.() ?? ({} as Values)
			for (const rule of options.rules ?? []) {
				if (abort.signal.aborted) break
				issues.push(...normalizeIssues(await rule(state.value, {values, signal: abort.signal})))
			}
		} catch(error) {
			if (!abort.signal.aborted) {
				issues.push({
					code: 'validation_error',
					message: error instanceof Error ? error.message : 'Validation failed.'
				})
			}
		}
		if (run !== validationRun || abort.signal.aborted) {
			const latest = activeValidation
			return latest && latest.run !== run ? latest.promise : store.getState().valid
		}
		const frozen = freezeIssues(issues)
		const external = store.getState().externalIssues
		store.setState({
			pending: false,
			issues: frozen,
			valid: frozen.length === 0 && external.length === 0,
			touched: trigger === 'submit' ? true : store.getState().touched
		})
		return frozen.length === 0 && external.length === 0
	}
	const validate = (trigger: ValidationTrigger = 'submit') => {
		const state = store.getState()
		if (state.disabled) return Promise.resolve(true)
		validationAbort?.abort()
		const abort = new AbortController()
		validationAbort = abort
		const run = ++validationRun
		store.setState({pending: true})
		const promise = executeValidation(trigger, state, abort, run)
		activeValidation = {run, promise}
		return promise
	}

	return {
		getState: store.getState,
		subscribe: store.subscribe,
		async setValue(value, trigger = 'input') {
			const next = structuredClone(value)
			store.setState({
				value: next,
				dirty: !equalValues(next, initialValue),
				externalIssues: [],
				valid: store.getState().issues.length === 0
			})
			options.onChange?.(next)
			return validateOn.has(trigger) ? validate(trigger) : store.getState().valid
		},
		setTouched(touched = true) {
			store.setState({touched})
			if (touched && validateOn.has('blur')) void validate('blur')
		},
		setDisabled(disabled) {
			store.setState({disabled})
		},
		setExternalIssues(issues) {
			const externalIssues = freezeIssues(issues)
			store.setState({
				externalIssues,
				valid: externalIssues.length === 0 && store.getState().issues.length === 0
			})
		},
		validate,
		reset(value = initialValue) {
			initialValue = structuredClone(value)
			validationAbort?.abort()
			store.setState({
				value: structuredClone(value),
				initialValue: structuredClone(value),
				touched: false,
				dirty: false,
				pending: false,
				valid: true,
				issues: [],
				externalIssues: []
			})
		},
		focus: () => options.getElement?.()?.focus(),
		destroy() {
			validationAbort?.abort()
			store.clear()
		}
	}
}

export type FormState<Values extends Record<string, unknown>> = {
	values: Values
	dirty: boolean
	valid: boolean
	pending: boolean
	submitting: boolean
	submitted: boolean
}

export type FormController<Values extends Record<string, unknown>> = {
	getState: () => FormState<Values>
	subscribe: (subscriber: Subscriber<FormState<Values>>) => () => void
	register: <Key extends keyof Values>(name: Key, field: FieldController<Values[Key]>) => () => void
	validate: () => Promise<boolean>
	submit: (handler: (values: Readonly<Values>) => void | Promise<void>) => Promise<boolean>
	reset: () => void
	focusFirstInvalid: () => void
	destroy: () => void
}

export const createFormController = <Values extends Record<string, unknown>>(
	initialValues: Values
): FormController<Values> => {
	const fields = new Map<keyof Values, FieldController<Values[keyof Values]>>()
	const unsubscribers = new Map<keyof Values, () => void>()
	const store = createControllerStore<FormState<Values>>({
		values: structuredClone(initialValues),
		dirty: false,
		valid: true,
		pending: false,
		submitting: false,
		submitted: false
	})
	const sync = () => {
		const values = {...store.getState().values}
		let dirty = false
		let valid = true
		let pending = false
		for (const [name, field] of fields) {
			const state = field.getState()
			values[name] = state.value
			dirty ||= state.dirty
			valid &&= state.valid
			pending ||= state.pending
		}
		store.setState({values: values as Values, dirty, valid, pending})
	}
	const validate = async() => {
		const results = await Promise.all([...fields.values()].map((field) => field.validate('submit')))
		sync()
		return results.every(Boolean)
	}
	const focusFirstInvalid = () => {
		for (const field of fields.values()) {
			if (!field.getState().valid) {
				field.focus()
				break
			}
		}
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe,
		register(name, field) {
			unsubscribers.get(name)?.()
			fields.set(name, field as unknown as FieldController<Values[keyof Values]>)
			unsubscribers.set(name, field.subscribe(sync))
			sync()
			return () => {
				unsubscribers.get(name)?.()
				unsubscribers.delete(name)
				fields.delete(name)
				sync()
			}
		},
		validate,
		async submit(handler) {
			store.setState({submitted: true})
			if (!(await validate())) {
				focusFirstInvalid()
				return false
			}
			store.setState({submitting: true})
			try {
				await handler(Object.freeze({...store.getState().values}))
				return true
			} finally {
				store.setState({submitting: false})
			}
		},
		reset() {
			for (const [name, field] of fields) field.reset(initialValues[name])
			store.setState({
				values: structuredClone(initialValues),
				dirty: false,
				valid: true,
				pending: false,
				submitting: false,
				submitted: false
			})
		},
		focusFirstInvalid,
		destroy() {
			for (const unsubscribe of unsubscribers.values()) unsubscribe()
			unsubscribers.clear()
			fields.clear()
			store.clear()
		}
	}
}
