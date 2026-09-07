const minimumBudget = 1_250_000
const initialBudget = 2_250_000
const maximumBudget = 4_000_000
const sampleWindowMs = 1_500
const minimumSamples = 30
const upscaleFactor = 1.125
const downscaleFactor = 0.8
const budgetQuantum = 50_000
const baselinePercentile = 0.2

const quantize = (value: number) => Math.round(value / budgetQuantum) * budgetQuantum

export const createAdaptivePixelBudget = () => {
	let budget = initialBudget
	let elapsed = 0
	let averageDelta = 0
	let sampleCount = 0
	let fastWindows = 0
	let baselineDelta: number | null = null
	let windowDeltas: number[] = []

	const resetWindow = () => {
		elapsed = 0
		averageDelta = 0
		sampleCount = 0
		windowDeltas = []
	}

	return {
		get value() { return budget },
		sample(delta: number) {
			if (!Number.isFinite(delta) || delta < 4 || delta > 100) return false
			elapsed += delta
			sampleCount += 1
			averageDelta += (delta - averageDelta) / sampleCount
			windowDeltas.push(delta)
			if (elapsed < sampleWindowMs || sampleCount < minimumSamples) return false

			const orderedDeltas = [...windowDeltas].sort((left, right) => left - right)
			const percentileIndex = Math.floor((orderedDeltas.length - 1) * baselinePercentile)
			const windowBaseline = orderedDeltas[percentileIndex] ?? averageDelta
			baselineDelta = baselineDelta === null
				? windowBaseline
				: Math.min(baselineDelta, windowBaseline)
			const slowFrameThresholdMs = Math.max(baselineDelta * 1.3, baselineDelta + 4)
			const fastFrameThresholdMs = baselineDelta * 1.08
			let next = budget
			if (averageDelta > slowFrameThresholdMs) {
				next = Math.max(minimumBudget, quantize(budget * downscaleFactor))
				fastWindows = 0
			} else if (averageDelta < fastFrameThresholdMs) {
				fastWindows += 1
				if (fastWindows >= 2) {
					next = Math.min(maximumBudget, quantize(budget * upscaleFactor))
					fastWindows = 0
				}
			} else {
				fastWindows = 0
			}

			resetWindow()
			if (next === budget) return false
			budget = next
			return true
		},
		reset() {
			budget = initialBudget
			fastWindows = 0
			baselineDelta = null
			resetWindow()
		}
	}
}

export const AUTO_PIXEL_BUDGET_RANGE = Object.freeze({
	minimum: minimumBudget,
	initial: initialBudget,
	maximum: maximumBudget
})
