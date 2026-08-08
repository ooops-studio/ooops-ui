// @vitest-environment jsdom
import fc from 'fast-check'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
	calculateLayerPosition,
	createMultiSelectController,
	createNumberInputController,
	createSliderController,
	type MultiSelectState
} from '../src/index'

beforeEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
	globalThis.ResizeObserver ??= class {
		observe() {}
		disconnect() {}
		unobserve() {}
	} as unknown as typeof ResizeObserver
})

type SelectionModel = {
	mounted: boolean
	open: boolean
	values: string[]
	available: string[]
}

type SelectionReal = {
	controller: ReturnType<typeof createMultiSelectController>
}

const options = [
	{value: 'a', label: 'Alpha'},
	{value: 'b', label: 'Beta'},
	{value: 'c', label: 'Gamma'},
	{value: 'disabled', label: 'Disabled', disabled: true}
]

const selectionFixture = (): SelectionReal => {
	document.body.innerHTML = `
		<div id="root"><input id="input"></div>
		<div id="listbox">
			${options.map((_, index) => `<div data-option-index="${index}"></div>`).join('')}
		</div>
	`
	return {
		controller: createMultiSelectController({
			options,
			maxSelected: 2,
			getRoot: () => document.querySelector('#root'),
			getInput: () => document.querySelector('#input'),
			getListbox: () => document.querySelector('#listbox'),
			getOptions: () => [...document.querySelectorAll('[data-option-index]')] as HTMLElement[]
		})
	}
}

const assertSelectionState = (model: SelectionModel, state: MultiSelectState) => {
	expect(state.mounted).toBe(model.mounted)
	expect(state.open).toBe(model.open)
	expect([...state.values]).toEqual(model.values)
	expect(new Set(state.values).size).toBe(state.values.length)
	expect(state.values.length).toBeLessThanOrEqual(2)
	expect(state.values).not.toContain('disabled')
	expect(state.values.every((value) => model.available.includes(value))).toBe(true)
}

class MountCommand implements fc.Command<SelectionModel, SelectionReal> {
	check = (model: Readonly<SelectionModel>) => !model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.mount()
		model.mounted = true
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => 'mount'
}

class OpenCommand implements fc.Command<SelectionModel, SelectionReal> {
	check = (model: Readonly<SelectionModel>) => model.mounted && !model.open
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.open()
		model.open = true
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => 'open'
}

class ToggleCommand implements fc.Command<SelectionModel, SelectionReal> {
	constructor(private readonly value: string) {}
	check = (model: Readonly<SelectionModel>) => model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.toggleValue(this.value)
		if (this.value !== 'disabled' && model.available.includes(this.value)) {
			if (model.values.includes(this.value))
				model.values = model.values.filter((value) => value !== this.value)
			else if (model.values.length < 2) model.values = [...model.values, this.value]
		}
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => `toggle(${this.value})`
}

class ClearCommand implements fc.Command<SelectionModel, SelectionReal> {
	check = (model: Readonly<SelectionModel>) => model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.clear()
		model.values = []
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => 'clear'
}

class ResetCommand implements fc.Command<SelectionModel, SelectionReal> {
	check = (model: Readonly<SelectionModel>) => model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.setValues([])
		model.values = []
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => 'reset'
}

class UpdateOptionsCommand implements fc.Command<SelectionModel, SelectionReal> {
	constructor(private readonly includeGamma: boolean) {}
	check = (model: Readonly<SelectionModel>) => model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		const nextOptions = options.filter((entry) => entry.value !== 'c' || this.includeGamma)
		real.controller.setOptions(nextOptions)
		model.available = nextOptions.map((entry) => entry.value)
		model.values = model.values.filter((value) => model.available.includes(value))
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => `updateOptions(includeGamma=${this.includeGamma})`
}

class SelectAllCommand implements fc.Command<SelectionModel, SelectionReal> {
	check = (model: Readonly<SelectionModel>) => model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.selectAll()
		model.values = model.available.filter((value) => value !== 'disabled').slice(0, 2)
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => 'selectAll'
}

class UnmountCommand implements fc.Command<SelectionModel, SelectionReal> {
	check = (model: Readonly<SelectionModel>) => model.mounted
	run(model: SelectionModel, real: SelectionReal) {
		real.controller.destroy()
		model.mounted = false
		model.open = false
		assertSelectionState(model, real.controller.getState())
	}
	toString = () => 'unmount'
}

describe('model-based controller lifecycle', () => {
	it('[FM-ASYNC-UNMOUNT] preserves multi-select invariants across random mount/open/select/reset/unmount sequences', () => {
		fc.assert(
			fc.property(
				fc.commands(
					[
						fc.constant(new MountCommand()),
						fc.constant(new OpenCommand()),
						fc.constant(new ClearCommand()),
						fc.constant(new ResetCommand()),
						fc.constant(new SelectAllCommand()),
						fc.constant(new UnmountCommand()),
						fc.boolean().map((includeGamma) => new UpdateOptionsCommand(includeGamma)),
						fc.constantFrom('a', 'b', 'c', 'disabled').map((value) => new ToggleCommand(value))
					],
					{maxCommands: 60}
				),
				(commands) => {
					fc.modelRun(
						() => ({
							model: {
								mounted: false,
								open: false,
								values: [],
								available: options.map((entry) => entry.value)
							},
							real: selectionFixture()
						}),
						commands
					)
				}
			),
			{numRuns: 100}
		)
	})
})

describe('property-level numeric and geometry invariants', () => {
	it('keeps collision-shifted layers inside arbitrary viewport bounds', () => {
		fc.assert(
			fc.property(
				fc.record({
					viewportWidth: fc.integer({min: 160, max: 2_000}),
					viewportHeight: fc.integer({min: 120, max: 1_400}),
					anchorLeft: fc.integer({min: -50, max: 2_000}),
					anchorTop: fc.integer({min: -50, max: 1_400}),
					anchorWidth: fc.integer({min: 1, max: 300}),
					anchorHeight: fc.integer({min: 1, max: 120}),
					layerWidth: fc.integer({min: 1, max: 600}),
					layerHeight: fc.integer({min: 1, max: 500}),
					placement: fc.constantFrom('top', 'bottom', 'left', 'right') as fc.Arbitrary<
						'top' | 'bottom' | 'left' | 'right'
					>,
					rtl: fc.boolean()
				}),
				(input) => {
					const padding = 12
					const anchor = new DOMRect(
						input.anchorLeft,
						input.anchorTop,
						input.anchorWidth,
						input.anchorHeight
					)
					const layer = new DOMRect(0, 0, input.layerWidth, input.layerHeight)
					const result = calculateLayerPosition(anchor, layer, {
						placement: input.placement,
						align: 'center',
						offset: 8,
						padding,
						rtl: input.rtl,
						viewport: {
							left: 0,
							top: 0,
							width: input.viewportWidth,
							height: input.viewportHeight
						}
					})
					expect(result.left).toBeGreaterThanOrEqual(padding)
					expect(result.top).toBeGreaterThanOrEqual(padding)
					expect(result.left).toBeLessThanOrEqual(input.viewportWidth - padding)
					expect(result.top).toBeLessThanOrEqual(input.viewportHeight - padding)
				}
			),
			{numRuns: 500}
		)
	})

	it('never lets randomized dual-slider keyboard movement cross the configured gap', () => {
		fc.assert(
			fc.property(
				fc.array(fc.constantFrom('ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'), {
					maxLength: 100
				}),
				(keys) => {
					document.body.innerHTML =
						'<div id="slider"><button data-thumb="0"></button><button data-thumb="1"></button></div>'
					const root = document.querySelector<HTMLElement>('#slider')!
					const thumbs = [...root.querySelectorAll<HTMLElement>('button')]
					const controller = createSliderController({
						value: [20, 80],
						min: 0,
						max: 100,
						step: 5,
						minStepsBetweenThumbs: 2,
						getRoot: () => root,
						getThumbs: () => thumbs
					})
					controller.mount()
					keys.forEach((key, index) =>
						thumbs[index % 2]!.dispatchEvent(
							new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true})
						)
					)
					const [low, high] = controller.getState().value as readonly [number, number]
					expect(high - low).toBeGreaterThanOrEqual(10)
					expect(low).toBeGreaterThanOrEqual(0)
					expect(high).toBeLessThanOrEqual(100)
					controller.destroy()
				}
			),
			{numRuns: 100}
		)
	})

	it('keeps intermediate number text until blur clamps a finite value', () => {
		fc.assert(
			fc.property(fc.integer({min: -1_000, max: 1_000}), (raw) => {
				document.body.innerHTML = '<input id="number">'
				const input = document.querySelector<HTMLInputElement>('#number')!
				const controller = createNumberInputController({
					min: 0,
					max: 10,
					step: 1,
					clampOnBlur: true,
					getInput: () => input
				})
				controller.mount()
				input.value = String(raw)
				input.dispatchEvent(new Event('input', {bubbles: true}))
				expect(controller.getState().text).toBe(String(raw))
				input.dispatchEvent(new FocusEvent('blur'))
				expect(controller.getState().value).toBe(Math.min(10, Math.max(0, raw)))
				controller.destroy()
			}),
			{numRuns: 100}
		)
	})
})
