import { describe, expect, it } from 'vitest'
import { snapFurnitureMm } from './furnitureDrag'

describe('furniture drag placement', () => {
  it('snaps positions to the nearest 10 cm', () => {
    expect(snapFurnitureMm(1249)).toBe(1200)
    expect(snapFurnitureMm(1250)).toBe(1300)
  })
  it('allows millimeter placement when precision is requested', () => {
    expect(snapFurnitureMm(1249.6, true)).toBe(1250)
    expect(snapFurnitureMm(1249.1, true)).toBe(1249)
  })
})
