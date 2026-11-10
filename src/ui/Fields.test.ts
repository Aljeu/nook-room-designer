import { describe, expect, it } from 'vitest'
import { parseMetric } from './Fields'

describe('precise metric editor input', () => {
  it('round trips every integer millimeter through centimeter and meter display', () => {
    for (let millimeters = 0; millimeters <= 12000; millimeters++) {
      expect(parseMetric(String(millimeters / 10), 10)).toBe(millimeters)
      expect(parseMetric(String(millimeters / 1000), 1000)).toBe(millimeters)
    }
  })
  it('rejects partial, signed, exponent, unsafe and over-precise values rather than rounding them', () => {
    for (const text of ['', '1.', '-1', '+2', '1e3', 'Infinity', 'NaN', '1,2', '9007199254740992']) {
      expect(parseMetric(text, 10)).toBeNull()
      expect(parseMetric(text, 1000)).toBeNull()
    }
    expect(parseMetric('0.01', 10)).toBeNull()
    expect(parseMetric('0.0001', 1000)).toBeNull()
    expect(parseMetric(' 330.1 ', 10)).toBe(3301)
  })
})
