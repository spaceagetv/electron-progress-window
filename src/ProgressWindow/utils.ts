/**
 * Utility functions to avoid external dependencies.
 * @internal
 */

/**
 * Deep partial type that recursively makes all properties optional.
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

/**
 * Check if a value is a plain object (not array, null, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  )
}

/**
 * Deep merge multiple objects into a target object.
 * Later sources override earlier ones.
 * Arrays are replaced, not merged.
 *
 * Type safety: Uses `object` type for sources which is safer than `any`
 * while remaining flexible for the merge pattern where target may be
 * an empty object that gets populated from sources.
 */
export function deepMerge<T extends object>(
  target: T,
  ...sources: Array<object | undefined | null>
): T {
  for (const source of sources) {
    if (!source) continue

    for (const key of Object.keys(source)) {
      const sourceValue = (source as Record<string, unknown>)[key]
      const targetValue = (target as Record<string, unknown>)[key]

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        ;(target as Record<string, unknown>)[key] = deepMerge(
          { ...targetValue },
          sourceValue
        )
      } else if (sourceValue !== undefined) {
        ;(target as Record<string, unknown>)[key] = sourceValue
      }
    }
  }

  return target
}

/**
 * Deep equality check for two values.
 * Handles primitives, arrays, plain objects, NaN, and Date objects.
 *
 * Limitations: Does not handle RegExp, Map, Set, or other built-in types.
 * For most configuration object comparisons, this is sufficient.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Same reference or identical primitives
  if (a === b) return true

  // Handle NaN (NaN !== NaN in JavaScript, but they should be semantically equal)
  if (
    typeof a === 'number' &&
    typeof b === 'number' &&
    Number.isNaN(a) &&
    Number.isNaN(b)
  ) {
    return true
  }

  // Handle null/undefined
  if (a == null || b == null) return a === b

  // Different types
  if (typeof a !== typeof b) return false

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqual(val, b[i]))
  }

  // Objects
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) return false

    return keysA.every((key) => deepEqual(a[key], b[key]))
  }

  // Primitives that aren't equal (already checked a === b)
  return false
}
