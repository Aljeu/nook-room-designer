import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { DOOR_STYLES } from '../catalog/doors'
import { buildDoorLocal } from './doors'

describe('door faces', () => {
  it('mirrors the actual detail geometry across the wall for each door design', () => {
    for (const style of DOOR_STYLES.filter((entry) => entry.category !== 'archways')) {
      const model = buildDoorLocal(style, style.widthMm, style.heightMm)
      model.updateMatrixWorld(true)
      const faces: THREE.Group[] = []
      model.traverse((object) => { if (object instanceof THREE.Group && object.name === 'Opposite door face') faces.push(object) })
      expect(faces.length).toBe(style.leafCount)
      for (const face of faces) for (const [index, mirrored] of face.children.entries()) {
        const originals = face.parent?.children.filter((child) => child !== face && !child.name.startsWith('Door leaf')) ?? []
        const original = originals[index]
        expect(original).toBeDefined()
        const a = new THREE.Box3().setFromObject(original!)
        const b = new THREE.Box3().setFromObject(mirrored)
        expect(a.min.z + b.max.z).toBeCloseTo(-.1, 5)
        expect(a.max.z + b.min.z).toBeCloseTo(-.1, 5)
        expect(a.min.x).toBeCloseTo(b.min.x, 5)
      }
    }
  })

  it('places arch trim on both sides of the wall', () => {
    for (const style of DOOR_STYLES.filter((entry) => entry.category === 'archways')) {
      const model = buildDoorLocal(style, style.widthMm, style.heightMm)
      model.updateMatrixWorld(true)
      expect(model.getObjectByName('Top cap')).toBeUndefined()
      expect(model.getObjectByName('Arch fill')).toBeDefined()
      const arches = model.children.filter((child) => child.name === 'Arch casing')
      expect(arches).toHaveLength(2)
      const a = new THREE.Box3().setFromObject(arches[0])
      const b = new THREE.Box3().setFromObject(arches[1])
      expect(a.min.z + b.max.z).toBeCloseTo(-.1, 5)
      expect(a.max.z + b.min.z).toBeCloseTo(-.1, 5)
    }
  })

  it('omits surrounding wall fill from standalone archway previews', () => {
    for (const style of DOOR_STYLES.filter((entry) => entry.category === 'archways')) {
      const preview = buildDoorLocal(style, style.widthMm, style.heightMm, { includeWallFill: false })
      expect(preview.getObjectByName('Arch fill')).toBeUndefined()
      expect(preview.children.some((child) => child.name === 'Arch casing')).toBe(true)
    }
  })
})
