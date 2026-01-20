/**
 * Tests for utils.ts - deepMerge and deepEqual functions
 */

import { describe, it, expect } from 'vitest'
import { deepMerge, deepEqual } from '../../src/ProgressWindow/utils'

describe('utils', () => {
  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1 }
      const source = { b: 2 }
      const result = deepMerge(target, source)
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should handle null sources in the array', () => {
      const target = { a: 1 }
      const result = deepMerge(target, null, { b: 2 })
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should handle undefined sources in the array', () => {
      const target = { a: 1 }
      const result = deepMerge(target, undefined, { b: 2 })
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should skip undefined values in source objects', () => {
      const target = { a: 1, b: 2 }
      const source = { a: undefined, c: 3 }
      const result = deepMerge(target, source)
      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should replace arrays (not merge them)', () => {
      const target = { arr: [1, 2, 3] }
      const source = { arr: [4, 5] }
      const result = deepMerge(target, source)
      expect(result).toEqual({ arr: [4, 5] })
    })

    it('should handle deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: { a: 1 },
          },
        },
      }
      const source = {
        level1: {
          level2: {
            level3: { b: 2 },
          },
        },
      }
      const result = deepMerge(target, source)
      expect(result).toEqual({
        level1: {
          level2: {
            level3: { a: 1, b: 2 },
          },
        },
      })
    })

    it('should handle empty source objects', () => {
      const target = { a: 1 }
      const result = deepMerge(target, {})
      expect(result).toEqual({ a: 1 })
    })

    it('should override primitive with object', () => {
      const target = { a: 1 } as Record<string, unknown>
      const source = { a: { nested: true } }
      const result = deepMerge(target, source)
      expect(result).toEqual({ a: { nested: true } })
    })

    it('should override object with primitive', () => {
      const target = { a: { nested: true } } as Record<string, unknown>
      const source = { a: 1 }
      const result = deepMerge(target, source)
      expect(result).toEqual({ a: 1 })
    })

    it('should handle multiple sources', () => {
      const target = { a: 1 }
      const source1 = { b: 2 }
      const source2 = { c: 3 }
      const source3 = { a: 10 }
      const result = deepMerge(target, source1, source2, source3)
      expect(result).toEqual({ a: 10, b: 2, c: 3 })
    })

    it('should not merge Date objects as plain objects', () => {
      const target = { date: new Date('2020-01-01') }
      const source = { date: new Date('2021-01-01') }
      const result = deepMerge(target, source)
      expect(result.date).toBeInstanceOf(Date)
      expect(result.date.getTime()).toBe(new Date('2021-01-01').getTime())
    })
  })

  describe('deepEqual', () => {
    describe('primitives', () => {
      it('should return true for identical primitives', () => {
        expect(deepEqual(1, 1)).toBe(true)
        expect(deepEqual('a', 'a')).toBe(true)
        expect(deepEqual(true, true)).toBe(true)
        expect(deepEqual(null, null)).toBe(true)
        expect(deepEqual(undefined, undefined)).toBe(true)
      })

      it('should return false for different primitives', () => {
        expect(deepEqual(1, 2)).toBe(false)
        expect(deepEqual('a', 'b')).toBe(false)
        expect(deepEqual(true, false)).toBe(false)
      })

      it('should return false for different types', () => {
        expect(deepEqual(1, '1')).toBe(false)
        expect(deepEqual(true, 1)).toBe(false)
        expect(deepEqual(null, undefined)).toBe(false)
      })
    })

    describe('NaN handling', () => {
      it('should return true for NaN === NaN', () => {
        expect(deepEqual(NaN, NaN)).toBe(true)
      })

      it('should return false for NaN vs number', () => {
        expect(deepEqual(NaN, 0)).toBe(false)
        expect(deepEqual(0, NaN)).toBe(false)
      })
    })

    describe('null and undefined', () => {
      it('should handle null vs undefined', () => {
        expect(deepEqual(null, undefined)).toBe(false)
        expect(deepEqual(undefined, null)).toBe(false)
      })

      it('should return true for null === null', () => {
        expect(deepEqual(null, null)).toBe(true)
      })

      it('should return true for undefined === undefined', () => {
        expect(deepEqual(undefined, undefined)).toBe(true)
      })

      it('should return false for null vs object', () => {
        expect(deepEqual(null, {})).toBe(false)
        expect(deepEqual({}, null)).toBe(false)
      })
    })

    describe('Date objects', () => {
      it('should return true for identical Date objects', () => {
        const date1 = new Date('2020-01-01')
        const date2 = new Date('2020-01-01')
        expect(deepEqual(date1, date2)).toBe(true)
      })

      it('should return false for different Date objects', () => {
        const date1 = new Date('2020-01-01')
        const date2 = new Date('2021-01-01')
        expect(deepEqual(date1, date2)).toBe(false)
      })

      it('should return false for Date vs non-Date', () => {
        const date = new Date('2020-01-01')
        expect(deepEqual(date, date.getTime())).toBe(false)
        expect(deepEqual(date.getTime(), date)).toBe(false)
      })
    })

    describe('arrays', () => {
      it('should return true for arrays with same values', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      })

      it('should return false for arrays with different lengths', () => {
        expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
        expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
      })

      it('should return false for arrays with different values', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      })

      it('should handle nested arrays', () => {
        expect(
          deepEqual(
            [
              [1, 2],
              [3, 4],
            ],
            [
              [1, 2],
              [3, 4],
            ]
          )
        ).toBe(true)
        expect(
          deepEqual(
            [
              [1, 2],
              [3, 4],
            ],
            [
              [1, 2],
              [3, 5],
            ]
          )
        ).toBe(false)
      })

      it('should return false for array vs object', () => {
        expect(deepEqual([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false)
        expect(deepEqual({ 0: 1, 1: 2, 2: 3 }, [1, 2, 3])).toBe(false)
      })

      it('should handle empty arrays', () => {
        expect(deepEqual([], [])).toBe(true)
        expect(deepEqual([], [1])).toBe(false)
      })
    })

    describe('objects', () => {
      it('should return true for objects with same keys and values', () => {
        expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      })

      it('should return false for objects with different key counts', () => {
        expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
        expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
      })

      it('should return false for objects with different values', () => {
        expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
      })

      it('should handle nested objects', () => {
        expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
          true
        )
        expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
          false
        )
      })

      it('should handle empty objects', () => {
        expect(deepEqual({}, {})).toBe(true)
        expect(deepEqual({}, { a: 1 })).toBe(false)
      })

      it('should return true for same reference', () => {
        const obj = { a: 1 }
        expect(deepEqual(obj, obj)).toBe(true)
      })
    })

    describe('mixed types in structures', () => {
      it('should handle objects with array values', () => {
        expect(deepEqual({ arr: [1, 2] }, { arr: [1, 2] })).toBe(true)
        expect(deepEqual({ arr: [1, 2] }, { arr: [1, 3] })).toBe(false)
      })

      it('should handle arrays with object values', () => {
        expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true)
        expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false)
      })

      it('should handle deeply nested mixed structures', () => {
        const a = {
          level1: {
            arr: [1, { nested: true }],
            date: new Date('2020-01-01'),
          },
        }
        const b = {
          level1: {
            arr: [1, { nested: true }],
            date: new Date('2020-01-01'),
          },
        }
        expect(deepEqual(a, b)).toBe(true)
      })
    })
  })
})
