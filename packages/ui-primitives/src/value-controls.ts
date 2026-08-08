import {createControllerStore, type Subscriber} from './store'

const decimals = (step: number) => Math.max(0, (String(step).split('.')[1] ?? '').length)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const snap = (value: number, min: number, step: number) =>
	Number((min + Math.round((value - min) / step) * step).toFixed(decimals(step)))

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
	const min = options.min ?? -Number.MAX_SAFE_INTEGER
	const max = options.max ?? Number.MAX_SAFE_INTEGER
	const step = options.step ?? 1
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
		setValue(clamp(snap(current + direction * step * multiplier, min, step), min, max), true)
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
		if (!options.clampOnBlur) return
		const value = store.getState().value
		if (value !== null) setValue(clamp(snap(value, min, step), min, max), true)
	}
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault()
			stepBy(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey ? 10 : 1)
		} else if (event.key === 'Home' && Number.isFinite(min)) {
			event.preventDefault()
			setValue(min, true)
		} else if (event.key === 'End' && Number.isFinite(max)) {
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
	getRoot: () => HTMLElement | null | undefined
	getThumbs: () => ReadonlyArray<HTMLElement>
	getInputs?: () => ReadonlyArray<HTMLInputElement>
	onChange?: (value: SliderValue) => void
}

export const createSliderController = (options: SliderControllerOptions) => {
	const min = options.min ?? 0
	const max = options.max ?? 100
	const step = options.step ?? 1
	const initial = options.value ?? options.defaultValue ?? min
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
		if (typeof value === 'number') return clamp(snap(value, min, step), min, max)
		const gap = (options.minStepsBetweenThumbs ?? 0) * step
		const low = clamp(snap(value[0], min, step), min, max - gap)
		const high = clamp(snap(value[1], min, step), low + gap, max)
		return Object.freeze([low, high] as const)
	}
	const sync = () => {
		const current = values()
		const root = options.getRoot()
		const thumbs = options.getThumbs()
		const inputs = options.getInputs?.() ?? []
		root?.setAttribute('data-orientation', options.orientation ?? 'horizontal')
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
		const current = values()
		if (current.length === 2) {
			const gap = (options.minStepsBetweenThumbs ?? 0) * step
			current[index] =
				index === 0
					? Math.min(next, current[1]! - gap)
					: Math.max(next, current[0]! + gap)
		} else current[index] = next
		setValue(current.length === 1 ? current[0]! : ([current[0]!, current[1]!] as const), true)
	}
	const onKey = (event: KeyboardEvent) => {
		const index = Number((event.currentTarget as HTMLElement).dataset.thumb) || 0
		const horizontal = (options.orientation ?? 'horizontal') === 'horizontal'
		const rtl = (options.direction ?? 'ltr') === 'rtl'
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
		if (event.button !== 0) return
		const root = options.getRoot()
		if (!root) return
		const rect = root.getBoundingClientRect()
		const vertical = (options.orientation ?? 'horizontal') === 'vertical'
		const ratio = vertical
			? 1 - clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1)
			: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1)
		const directedRatio = !vertical && (options.direction ?? 'ltr') === 'rtl' ? 1 - ratio : ratio
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
			for (const thumb of options.getThumbs()) thumb.addEventListener('keydown', onKey)
			options.getRoot()?.addEventListener('pointerdown', onPointer)
			store.setState({mounted: true})
			setValue(initial)
		},
		setValue,
		setActiveThumb(activeThumb: 0 | 1) {
			store.setState({activeThumb})
		},
		destroy() {
			for (const thumb of options.getThumbs()) thumb.removeEventListener('keydown', onKey)
			options.getRoot()?.removeEventListener('pointerdown', onPointer)
			store.setState({mounted: false})
			store.clear()
		}
	}
}
