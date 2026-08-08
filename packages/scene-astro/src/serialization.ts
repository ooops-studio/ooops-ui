const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype'])

export const serializeSceneConfig = (value: unknown) =>
	JSON.stringify(copyJson(value, '$', 0, new WeakSet<object>()))
		.replaceAll('<', '\\u003c')
		.replaceAll('>', '\\u003e')
		.replaceAll('&', '\\u0026')
		.replaceAll('\u2028', '\\u2028')
		.replaceAll('\u2029', '\\u2029')

const copyJson = (
	value: unknown,
	path: string,
	depth: number,
	seen: WeakSet<object>
): unknown => {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (!value || typeof value !== 'object') throw new TypeError(`${path} must be JSON-safe.`)
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
		const result: Record<string, unknown> = Object.create(null)
		for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
			if (unsafeKeys.has(key)) throw new TypeError(`${path}.${key} is not allowed.`)
			if (!('value' in descriptor)) throw new TypeError(`${path}.${key} must not be an accessor.`)
			result[key] = copyJson(descriptor.value, `${path}.${key}`, depth + 1, seen)
		}
		return result
	} finally {
		seen.delete(value)
	}
}
