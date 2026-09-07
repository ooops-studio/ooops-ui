import {describe, expect, it} from 'vitest'

import {AUTO_PIXEL_BUDGET_RANGE, createAdaptivePixelBudget} from '../src/adaptive-resolution'

const sampleFrames = (
	controller: ReturnType<typeof createAdaptivePixelBudget>,
	delta: number,
	count: number
) => {
	let changed = false
	for (let index = 0; index < count; index += 1) changed = controller.sample(delta) || changed
	return changed
}

describe('adaptive auto resolution', () => {
	it('raises the pixel budget only after sustained smooth frame cadence', () => {
		const controller = createAdaptivePixelBudget()
		expect(controller.value).toBe(AUTO_PIXEL_BUDGET_RANGE.initial)
		expect(sampleFrames(controller, 16.67, 90)).toBe(false)
		expect(sampleFrames(controller, 16.67, 90)).toBe(true)
		expect(controller.value).toBeGreaterThan(AUTO_PIXEL_BUDGET_RANGE.initial)
	})

	it('reduces the budget quickly on slow frame cadence and keeps it bounded', () => {
		const controller = createAdaptivePixelBudget()
		sampleFrames(controller, 16.67, 90)
		expect(sampleFrames(controller, 28, 60)).toBe(true)
		expect(controller.value).toBeLessThan(AUTO_PIXEL_BUDGET_RANGE.initial)
		for (let window = 0; window < 20; window += 1) sampleFrames(controller, 40, 40)
		expect(controller.value).toBe(AUTO_PIXEL_BUDGET_RANGE.minimum)
	})

	it('calibrates to a stable 30 Hz cadence instead of treating it as GPU pressure', () => {
		const controller = createAdaptivePixelBudget()
		expect(sampleFrames(controller, 33.33, 46)).toBe(false)
		expect(sampleFrames(controller, 33.33, 46)).toBe(true)
		expect(controller.value).toBeGreaterThan(AUTO_PIXEL_BUDGET_RANGE.initial)
	})

	it('recovers toward but never beyond the high-quality ceiling', () => {
		const controller = createAdaptivePixelBudget()
		for (let window = 0; window < 24; window += 1) sampleFrames(controller, 8, 190)
		expect(controller.value).toBe(AUTO_PIXEL_BUDGET_RANGE.maximum)
		controller.reset()
		expect(controller.value).toBe(AUTO_PIXEL_BUDGET_RANGE.initial)
	})

	it('ignores invalid and discontinuous timing samples', () => {
		const controller = createAdaptivePixelBudget()
		for (const delta of [0, 1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(controller.sample(delta)).toBe(false)
		}
		expect(controller.value).toBe(AUTO_PIXEL_BUDGET_RANGE.initial)
	})
})
