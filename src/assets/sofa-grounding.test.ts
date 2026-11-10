import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { defaultFinishes, getConcept } from '../catalog'
import { buildFurniture, disposeFurniture, prepareFurniture } from './models'

beforeAll(() => prepareFurniture(['SOF-FIL-02', 'SOF-FIL-03']))

function sofa(id: string) {
  return buildFurniture({ id, conceptId: id, centerXMm: 0, centerZMm: 0, quarterTurn: 0, finishes: defaultFinishes(getConcept(2, id)!) })
}

describe('Filipino sofa construction', () => {
  it('brings both front posts down to the floor', () => {
    const model = sofa('SOF-FIL-02')
    try {
      model.updateMatrixWorld(true)
      const frame = model.getObjectByName('Frame') as THREE.Mesh
      for (const x of [-.83, .83]) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, -.05, .28), new THREE.Vector3(0, 1, 0))
        const hits = ray.intersectObject(frame)
        expect(hits.length).toBeGreaterThan(0)
        expect(hits[0].point.y).toBeCloseTo(0, 4)
      }
    } finally { disposeFurniture(model) }
  })

  it('keeps the upper rattan rail on the woven back curve', () => {
    const model = sofa('SOF-FIL-03')
    try {
      const frame = model.getObjectByName('Frame') as THREE.Mesh
      const p = frame.geometry.getAttribute('position')
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) < .81) continue
        const radius = Math.hypot(p.getX(i), p.getZ(i) - .475)
        expect(radius).toBeGreaterThan(.84)
        expect(radius).toBeLessThan(.96)
      }
      for (const side of [-1, 1]) {
        const angle = Math.PI / 10
        const x = side * (.89 * Math.cos(angle) + .20 * Math.sin(angle))
        const z = .475 - .89 * Math.sin(angle) + .20 * Math.cos(angle)
        const distances = Array.from({ length: p.count }, (_, i) => Math.hypot(p.getX(i) - x, p.getY(i) - .84, p.getZ(i) - z))
        expect(Math.min(...distances)).toBeLessThan(.04)
      }
    } finally { disposeFurniture(model) }
  })
})
