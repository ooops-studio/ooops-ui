const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype'])

export const snapshotSceneConfig = <Value>(value: Value): Readonly<Value> =>
	deepFreeze(copyJson(value, '$', 0, new WeakSet<object>())) as Readonly<Value>

const copyJson = (
	value: unknown,
	path: string,
	depth: number,
	seen: WeakSet<object>
): unknown => {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new TypeError(`${path} must contain finite numbers.`)
		return value
	}
	if (!value || typeof value !== 'object') {
		throw new TypeError(`${path} must be JSON-safe.`)
	}
	if (depth > 12) throw new TypeError(`${path} exceeds the maximum scene config depth.`)
	if (seen.has(value)) throw new TypeError(`${path} must not contain cycles.`)
	seen.add(value)
	try {
		if (Array.isArray(value)) {
			if (value.length > 1024 || Object.keys(value).length !== value.length) {
				throw new TypeError(`${path} must be a dense bounded array.`)
			}
			return value.map((entry, index) => copyJson(entry, `${path}[${index}]`, depth + 1, seen))
		}
		const prototype = Object.getPrototypeOf(value)
		if (prototype !== Object.prototype && prototype !== null) {
			throw new TypeError(`${path} must contain plain objects.`)
		}
		const descriptors = Object.getOwnPropertyDescriptors(value)
		const entries = Object.entries(descriptors)
		if (entries.length > 256) throw new TypeError(`${path} has too many properties.`)
		const result: Record<string, unknown> = Object.create(null)
		for (const [key, descriptor] of entries) {
			if (unsafeKeys.has(key)) throw new TypeError(`${path}.${key} is not allowed.`)
			if (!('value' in descriptor)) throw new TypeError(`${path}.${key} must not be an accessor.`)
			result[key] = copyJson(descriptor.value, `${path}.${key}`, depth + 1, seen)
		}
		return result
	} finally {
		seen.delete(value)
	}
}

const deepFreeze = <Value>(value: Value): Value => {
	if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
	for (const child of Object.values(value)) deepFreeze(child)
	return Object.freeze(value)
}
