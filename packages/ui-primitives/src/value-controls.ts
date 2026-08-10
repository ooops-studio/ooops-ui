import {createControllerStore, type Subscriber} from './store'

const decimals = (step: number) => Math.max(0, (String(step).split('.')[1] ?? '').length)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const snap = (value: number, min: number, step: number) =>
	Number((min + Math.round((value - min) / step) * step).toFixed(decimals(step)))

const assertNumberRange = (min: number, max: number, step: number, name: string) => {
	if (Number.isNaN(min) || Number.isNaN(max) || min > max)
		throw new RangeError(`${name} requires min to be less than or equal to max.`)
	if (!Number.isFinite(step) || step <= 0)
		throw new RangeError(`${name} requires step to be a finite number greater than zero.`)
}

export type NumberInputState = {
	value: number | null
	text: string
	valid: boolean
	mounted: boolean
}
export type NumberInputControllerOptions = {
	value?: number | null
	defaultValue?: number | null
	min?: number
	max?: number
	step?: number
	clampOnBlur?: boolean
	getInput: () => HTMLInputElement | null | undefined
	getIncrement?: () => HTMLElement | null | undefined
	getDecrement?: () => HTMLElement | null | undefined
	onChange?: (value: number | null) => void
}

export const createNumberInputController = (options: NumberInputControllerOptions) => {
	const initial = options.value ?? options.defaultValue ?? null
	let min = options.min ?? Number.NEGATIVE_INFINITY
	let max = options.max ?? Number.POSITIVE_INFINITY
	let hasMin = options.min !== undefined
	let hasMax = options.max !== undefined
	let snapOrigin = options.min ?? 0
	let step = options.step ?? 1
	let clampOnBlur = options.clampOnBlur ?? false
	assertNumberRange(min, max, step, 'NumberInput')
	const store = createControllerStore<NumberInputState>({
		value: initial,
		text: initial === null ? '' : String(initial),
		valid: true,
		mounted: false
	})
	const setValue = (value: number | null, emit = false) => {
		const valid = value === null || (Number.isFinite(value) && value >= min && value <= max)
		store.setState({value, text: value === null ? '' : String(value), valid})
		const input = options.getInput()
		if (input) {
			input.value = value === null ? '' : String(value)
			input.setAttribute('aria-invalid', String(!valid))
		}
		if (emit) options.onChange?.(value)
	}
	const stepBy = (direction: 1 | -1, multiplier = 1) => {
		const current =
			store.getState().value ?? (direction === 1 ? Math.max(0, min) : Math.min(0, max))
		setValue(
			clamp(snap(current + direction * step * multiplier, snapOrigin, step), min, max),
			true
		)
	}
	const onInput = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement
		const text = input.value
		const value = text.trim() === '' ? null : Number(text)
		const valid = value === null || (Number.isFinite(value) && value >= min && value <= max)
		store.setState({text, value: Number.isFinite(value) ? value : null, valid})
		input.setAttribute('aria-invalid', String(!valid))
		options.onChange?.(Number.isFinite(value) ? value : null)
	}
	const onBlur = () => {
		if (!clampOnBlur) return
		const value = store.getState().value
		if (value !== null) setValue(clamp(snap(value, snapOrigin, step), min, max), true)
	}
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault()
			stepBy(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey ? 10 : 1)
		} else if (event.key === 'Home' && hasMin) {
			event.preventDefault()
			setValue(min, true)
		} else if (event.key === 'End' && hasMax) {
			event.preventDefault()
			setValue(max, true)
		}
	}
	const increment = () => stepBy(1)
	const decrement = () => stepBy(-1)
	return {
		getState: store.getState,
		subscribe: store.subscribe as (subscriber: Subscriber<NumberInputState>) => () => void,
		mount() {
			if (store.getState().mounted) return
			const input = options.getInput()
			if (!input) return
			input.addEventListener('input', onInput)
			input.addEventListener('blur', onBlur)
			input.addEventListener('keydown', onKey)
			options.getIncrement?.()?.addEventListener('click', increment)
			options.getDecrement?.()?.addEventListener('click', decrement)
			store.setState({mounted: true})
			setValue(initial)
		},
		setValue,
		stepBy,
		configure(next: Pick<NumberInputControllerOptions, 'min' | 'max' | 'step' | 'clampOnBlur'>) {
			const nextMin = next.min ?? Number.NEGATIVE_INFINITY
			const nextMax = next.max ?? Number.POSITIVE_INFINITY
			const nextStep = next.step ?? 1
			assertNumberRange(nextMin, nextMax, nextStep, 'NumberInput')
			min = nextMin
			max = nextMax
			hasMin = next.min !== undefined
			hasMax = next.max !== undefined
			snapOrigin = next.min ?? 0
			step = nextStep
			clampOnBlur = next.clampOnBlur ?? false
			setValue(store.getState().value)
		},
		reset: () => setValue(options.defaultValue ?? initial),
		destroy() {
			const input = options.getInput()
			input?.removeEventListener('input', onInput)
			input?.removeEventListener('blur', onBlur)
			input?.removeEventListener('keydown', onKey)
			options.getIncrement?.()?.removeEventListener('click', increment)
			options.getDecrement?.()?.removeEventListener('click', decrement)
			store.setState({mounted: false})
			store.clear()
		}
	}
}

export type SliderValue = number | readonly [number, number]
export type SliderState = {value: SliderValue; activeThumb: 0 | 1; mounted: boolean}
export type SliderControllerOptions = {
	value?: SliderValue
	defaultValue?: SliderValue
	min?: number
	max?: number
	step?: number
	orientation?: 'horizontal' | 'vertical'
	direction?: 'ltr' | 'rtl'
	minStepsBetweenThumbs?: number
	disabled?: boolean
	getRoot: () => HTMLElement | null | undefined
	getThumbs: () => ReadonlyArray<HTMLElement>
	getInputs?: () => ReadonlyArray<HTMLInputElement>
	onChange?: (value: SliderValue) => void
}

export const createSliderController = (options: SliderControllerOptions) => {
	let config = {
		min: options.min ?? 0,
		max: options.max ?? 100,
		step: options.step ?? 1,
		orientation: options.orientation ?? 'horizontal' as const,
		direction: options.direction ?? 'ltr' as const,
		minStepsBetweenThumbs: options.minStepsBetweenThumbs ?? 0,
		disabled: options.disabled ?? false
	}
	const validateConfig = (next: typeof config) => {
		assertNumberRange(next.min, next.max, next.step, 'Slider')
		if (next.min === next.max) throw new RangeError('Slider requires min to be less than max.')
		if (!Number.isFinite(next.minStepsBetweenThumbs) || next.minStepsBetweenThumbs < 0)
			throw new RangeError('Slider requires minStepsBetweenThumbs to be zero or greater.')
		if (next.minStepsBetweenThumbs * next.step > next.max - next.min)
			throw new RangeError('Slider minimum thumb gap cannot exceed its value range.')
	}
	validateConfig(config)
	const initial = options.value ?? options.defaultValue ?? config.min
	const store = createControllerStore<SliderState>({
		value: initial,
		activeThumb: 0,
		mounted: false
	})
	const values = () => {
		const value = store.getState().value
		return typeof value === 'number' ? [value] : [...value]
	}
	const normalize = (value: SliderValue): SliderValue => {
		const {min, max, step, minStepsBetweenThumbs} = config
		if (typeof value === 'number') return clamp(snap(value, min, step), min, max)
		const gap = minStepsBetweenThumbs * step
		const low = clamp(snap(value[0], min, step), min, max - gap)
		const high = clamp(snap(value[1], min, step), low + gap, max)
		return Object.freeze([low, high] as const)
	}
	const sync = () => {
		const {min, max, orientation, disabled} = config
		const current = values()
		const root = options.getRoot()
		const thumbs = options.getThumbs()
		const inputs = options.getInputs?.() ?? []
		root?.setAttribute('data-orientation', orientation)
		root?.setAttribute('data-disabled', String(disabled))
		current.forEach((value, index) => {
			const thumb = thumbs[index]
			if (thumb) {
				thumb.setAttribute('role', 'slider')
				thumb.setAttribute('aria-valuemin', String(min))
				thumb.setAttribute('aria-valuemax', String(max))
				thumb.setAttribute('aria-valuenow', String(value))
				thumb.dataset.thumb = String(index)
				thumb.style.setProperty(
					'--ooops-ui-slider-percent',
					`${((value - min) / (max - min)) * 100}%`
				)
			}
			if (inputs[index]) inputs[index]!.value = String(value)
		})
	}
	const setValue = (value: SliderValue, emit = false) => {
		const next = normalize(value)
		store.setState({value: next})
		sync()
		if (emit) options.onChange?.(next)
	}
	const updateThumb = (index: number, next: number) => {
		const {step, minStepsBetweenThumbs} = config
		const current = values()
		if (current.length === 2) {
			const gap = minStepsBetweenThumbs * step
			current[index] =
				index === 0
					? Math.min(next, current[1]! - gap)
					: Math.max(next, current[0]! + gap)
		} else current[index] = next
		setValue(current.length === 1 ? current[0]! : ([current[0]!, current[1]!] as const), true)
	}
	const onKey = (event: KeyboardEvent) => {
		if (config.disabled) return
		const thumb = (event.target as Element | null)?.closest<HTMLElement>('[data-thumb]')
		if (!thumb || !options.getThumbs().includes(thumb)) return
		const index = Number(thumb.dataset.thumb) || 0
		const {min, max, step, orientation, direction} = config
		const horizontal = orientation === 'horizontal'
		const rtl = direction === 'rtl'
		const positive =
			event.key === 'ArrowUp' || (horizontal && event.key === (rtl ? 'ArrowLeft' : 'ArrowRight'))
		const negative =
			event.key === 'ArrowDown' || (horizontal && event.key === (rtl ? 'ArrowRight' : 'ArrowLeft'))
		if (positive || negative) {
			event.preventDefault()
			updateThumb(index, values()[index]! + (positive ? step : -step))
		} else if (event.key === 'PageUp' || event.key === 'PageDown') {
			event.preventDefault()
			updateThumb(index, values()[index]! + (event.key === 'PageUp' ? step * 10 : -step * 10))
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault()
			updateThumb(index, event.key === 'Home' ? min : max)
		}
	}
	const onPointer = (event: PointerEvent) => {
		if (config.disabled || event.button !== 0) return
		const {min, max, orientation, direction} = config
		const root = options.getRoot()
		if (!root) return
		const rect = root.getBoundingClientRect()
		const vertical = orientation === 'vertical'
		const ratio = vertical
			? 1 - clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1)
			: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1)
		const directedRatio = !vertical && direction === 'rtl' ? 1 - ratio : ratio
		const next = min + directedRatio * (max - min)
		const current = values()
		const index =
			current.length === 1 || Math.abs(current[0]! - next) <= Math.abs(current[1]! - next) ? 0 : 1
		store.setState({activeThumb: index as 0 | 1})
		updateThumb(index, next)
		options.getThumbs()[index]?.focus()
	}
	return {
		getState: store.getState,
		subscribe: store.subscribe as (subscriber: Subscriber<SliderState>) => () => void,
		mount() {
			if (store.getState().mounted) return
			const root = options.getRoot()
			if (!root) return
			root.addEventListener('keydown', onKey)
			root.addEventListener('pointerdown', onPointer)
			store.setState({mounted: true})
			setValue(initial)
		},
		setValue,
		refresh: sync,
		configure(next: Partial<typeof config>) {
			const merged = {...config, ...next}
			validateConfig(merged)
			config = merged
			setValue(store.getState().value)
		},
		setActiveThumb(activeThumb: 0 | 1) {
			store.setState({activeThumb})
		},
		destroy() {
			const root = options.getRoot()
			root?.removeEventListener('keydown', onKey)
			root?.removeEventListener('pointerdown', onPointer)
			store.setState({mounted: false})
			store.clear()
		}
	}
}
