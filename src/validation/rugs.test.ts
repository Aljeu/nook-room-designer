import { describe, expect, it } from 'vitest'
import { getConcept } from '../catalog'
import { createSampleProject } from '../domain/sample'
import { validateStructure } from './structural'

for (const id of ['RUG-SCA-01', 'RUG-MCM-01']) {
  describe(`${id} paired textile finishes`, () => {
    const enabled = !!getConcept(2, id)?.available
    const withFinishes = (ground: string, motif: string) => {
      const envelope = createSampleProject()
      envelope.project.instances[2].conceptId = id
      envelope.project.instances[2].finishes = { TextileGround: ground, TextileMotif: motif }
      return envelope
    }
    it.runIf(enabled)('accepts the default pair and its swapped pair', () => {
      expect(validateStructure(withFinishes('OAT', 'RBL')).success).toBe(true)
      expect(validateStructure(withFinishes('RBL', 'OAT')).success).toBe(true)
    })
    it.runIf(enabled)('rejects matching colors and colors outside the pair', () => {
      for (const [ground, motif] of [['OAT', 'OAT'], ['RBL', 'RBL'], ['OAT', 'OAK']]) {
        expect(validateStructure(withFinishes(ground, motif)).success).toBe(false)
      }
    })
    it.runIf(!enabled)('continues to reject the concept while its model is unavailable', () => {
      const result = validateStructure(withFinishes('OAT', 'RBL'))
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('not yet available'))).toBe(true)
    })
  })
}
